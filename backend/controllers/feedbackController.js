const Feedback = require('../models/Feedback');
const Form = require('../models/Form');
const User = require('../models/User');
const University = require('../models/University');
const Subject = require('../models/Subject');
const { isValidObjectId, isNonEmptyString } = require('../utils/validators');
const { analyzeFeedbackWithModel } = require('../services/aiNlpEngine');

function normalizeAnswers(answers) {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers
    .map((item, index) => {
      if (typeof item === 'string') {
        return { question: `Question ${index + 1}`, answer: item.trim() };
      }

      if (item && typeof item === 'object') {
        const question = isNonEmptyString(item.question)
          ? item.question.trim()
          : `Question ${index + 1}`;
        const answerRaw = item.answer ?? item.value ?? '';
        return { question, answer: String(answerRaw).trim() };
      }

      return { question: `Question ${index + 1}`, answer: String(item ?? '').trim() };
    })
    .filter((item) => item.answer.length > 0);
}

function buildRawText(normalizedAnswers) {
  return normalizedAnswers
    .map((item) => `${item.question}: ${item.answer}`)
    .join(' | ')
    .trim();
}

function normalizeQuestion(question, index) {
  if (typeof question === 'string') {
    const text = question.trim();
    return {
      text: text || `Question ${index + 1}`,
      answerType: 'paragraph',
      ratingScale: { min: 1, max: 5 }
    };
  }

  if (question && typeof question === 'object') {
    const textRaw = question.text ?? question.question ?? '';
    const text = String(textRaw).trim() || `Question ${index + 1}`;
    const answerType = question.answerType === 'rating' || question.type === 'rating'
      ? 'rating'
      : 'paragraph';
    const minRaw = question.ratingScale?.min ?? 1;
    const maxRaw = question.ratingScale?.max ?? 5;
    const min = Number.parseInt(minRaw, 10);
    const max = Number.parseInt(maxRaw, 10);

    return {
      text,
      answerType,
      ratingScale: {
        min: Number.isNaN(min) || min < 1 ? 1 : min,
        max: Number.isNaN(max) || max < min ? 5 : max
      }
    };
  }

  return {
    text: `Question ${index + 1}`,
    answerType: 'paragraph',
    ratingScale: { min: 1, max: 5 }
  };
}

function normalizeAnswersForForm(form, answers) {
  const normalizedQuestions = Array.isArray(form?.questions)
    ? form.questions.map((question, index) => normalizeQuestion(question, index))
    : [];

  return normalizedQuestions
    .map((question, index) => {
      const item = Array.isArray(answers) ? answers[index] : null;
      const answerRaw = item && typeof item === 'object'
        ? item.answer ?? item.value ?? ''
        : item;
      const answer = String(answerRaw ?? '').trim();

      if (!answer) {
        return null;
      }

      return {
        question: question.text,
        answer,
        answerType: question.answerType,
        ratingScale: question.ratingScale
      };
    })
    .filter(Boolean);
}

async function getTeacherScopeByUniversityUser(userId) {
  const universityUser = await User.findById(userId).select('role universityCode');
  if (!universityUser || universityUser.role !== 'university') {
    return [];
  }

  const university = await University.findOne({ universityCode: universityUser.universityCode }).select('_id');
  if (!university) {
    return [];
  }

  const teachers = await User.find({ role: 'teacher', universityId: university._id }).select('_id');
  return teachers.map((t) => t._id);
}

function normalizeClassName(className) {
  if (!isNonEmptyString(className)) {
    return 'Unassigned';
  }

  return className.trim();
}

function sentimentToRating(sentiment) {
  if (sentiment === 'positive') return 5;
  if (sentiment === 'negative') return 2;
  return 3;
}

function getFormRatingScale(form) {
  const ratingQuestions = Array.isArray(form?.questions)
    ? form.questions.map((question, index) => normalizeQuestion(question, index)).filter((question) => question.answerType === 'rating')
    : [];

  if (ratingQuestions.length === 0) {
    return { min: 1, max: 5 };
  }

  const min = Math.min(...ratingQuestions.map((question) => question.ratingScale.min));
  const max = Math.max(...ratingQuestions.map((question) => question.ratingScale.max));

  return { min, max };
}

function clampToRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function getOrCreateComplaintForm(studentId, teacherId) {
  const existing = await Form.findOne({
    type: 'complaint',
    createdBy: studentId,
    assignedTeacher: teacherId,
    isActive: true
  });

  if (existing) {
    return existing;
  }

  return Form.create({
    title: 'Student Complaint',
    questions: ['What is your complaint?'],
    type: 'complaint',
    assignedTeacher: teacherId,
    createdBy: studentId,
    isActive: true
  });
}

exports.submitFeedback = async (req, res, next) => {
  try {
    const { formId, answers, teacherId, rating } = req.body;

    if (!isValidObjectId(formId)) {
      return res.status(400).json({ error: 'Valid formId is required' });
    }

    const student = await User.findById(req.user.id).select('role teacherId className');
    if (!student || student.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit feedback' });
    }

    const form = await Form.findById(formId);
    if (!form || !form.isActive) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const existingSubmission = await Feedback.findOne({ formId, studentId: student._id });
    if (existingSubmission) {
      return res.status(409).json({ error: 'You have already submitted this form' });
    }

    const normalizedAnswers = normalizeAnswersForForm(form, answers);
    if (normalizedAnswers.length === 0) {
      return res.status(400).json({ error: 'answers must include at least one non-empty response' });
    }

    let resolvedTeacherId = null;
    if (form.type === 'complaint') {
      resolvedTeacherId = student.teacherId || form.assignedTeacher || (isValidObjectId(teacherId) ? teacherId : null);
      if (!resolvedTeacherId) {
        return res.status(400).json({ error: 'Complaint requires a teacher assignment (teacherId)' });
      }
    } else {
      resolvedTeacherId = form.assignedTeacher;
      if (!resolvedTeacherId) {
        return res.status(400).json({ error: 'Form is not assigned to any teacher' });
      }

      if (!student.teacherId || String(student.teacherId) !== String(resolvedTeacherId)) {
        return res.status(403).json({ error: 'You can only submit forms assigned to your teacher' });
      }
    }

    const ratingQuestions = Array.isArray(form.questions)
      ? form.questions.map((question, index) => normalizeQuestion(question, index)).filter((question) => question.answerType === 'rating')
      : [];
    const { min: ratingMin, max: ratingMax } = getFormRatingScale(form);
    const ratingValues = normalizedAnswers
      .filter((item) => item.answerType === 'rating')
      .map((item) => Number.parseInt(item.answer, 10))
      .filter((value) => !Number.isNaN(value));

    let normalizedRating;
    if (ratingQuestions.length > 0) {
      if (ratingValues.length === 0) {
        return res.status(400).json({ error: 'Rating questions must include a valid rating value' });
      }

      const averageRating = Math.round(ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length);
      normalizedRating = clampToRange(averageRating, ratingMin, ratingMax);
    } else if (rating === undefined || rating === null || rating === '') {
      normalizedRating = clampToRange(sentimentToRating(sentiment), ratingMin, ratingMax);
    } else {
      normalizedRating = Number.parseInt(rating, 10);
      if (Number.isNaN(normalizedRating) || normalizedRating < ratingMin || normalizedRating > ratingMax) {
        return res.status(400).json({ error: `rating must be between ${ratingMin} and ${ratingMax}` });
      }
    }

    const rawText = buildRawText(normalizedAnswers);

    const analysis = await analyzeFeedbackWithModel(rawText, normalizedRating, { feedbackType: 'feedback' });
    const { sentiment, category, suggestion, alertFlag, alertReasons } = analysis;

    const feedback = new Feedback({
      formId,
      studentId: student._id,
      teacherId: resolvedTeacherId,
      subjectId: form.subjectId || undefined,
      className: normalizeClassName(student.className),
      rating: normalizedRating,
      answers: normalizedAnswers,
      rawText,
      sentiment,
      category,
      suggestion,
      alertFlag,
      alertReasons
    });

    await feedback.save();

    return res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (err) { next(err); }
};

exports.submitComplaint = async (req, res, next) => {
  try {
    const { complaint } = req.body;

    if (!isNonEmptyString(complaint)) {
      return res.status(400).json({ error: 'complaint is required' });
    }

    const student = await User.findById(req.user.id).select('role teacherId className');
    if (!student || student.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit complaints' });
    }

    if (!student.teacherId) {
      return res.status(400).json({ error: 'You must be assigned to a teacher before submitting a complaint' });
    }

    const teacher = await User.findById(student.teacherId).select('role _id');
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ error: 'Assigned teacher is not available' });
    }

    const normalizedAnswers = [{
      question: 'What is your complaint?',
      answer: complaint.trim()
    }];

    const rawText = buildRawText(normalizedAnswers);
    const analysis = await analyzeFeedbackWithModel(rawText, null, { feedbackType: 'complaint' });
    const { sentiment, category, suggestion, alertFlag, alertReasons } = analysis;
    const complaintForm = await getOrCreateComplaintForm(student._id, teacher._id);

    const feedback = new Feedback({
      formId: complaintForm._id,
      studentId: student._id,
      teacherId: teacher._id,
      className: normalizeClassName(student.className),
      answers: normalizedAnswers,
      rawText,
      sentiment,
      category,
      suggestion,
      alertFlag,
      alertReasons
    });

    await feedback.save();

    return res.status(201).json({ message: 'Complaint submitted successfully', feedback });
  } catch (err) {
    return next(err);
  }
};

exports.getFeedbacks = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const query = {};

    let universityTeacherScope = [];

    if (user.role === 'teacher') {
      query.teacherId = user._id;
    } else if (user.role === 'student') {
      query.studentId = user._id;
    } else if (user.role === 'university') {
      universityTeacherScope = await getTeacherScopeByUniversityUser(user._id);
      query.teacherId = { $in: universityTeacherScope };
    }

    if (isNonEmptyString(req.query.teacherId) && isValidObjectId(req.query.teacherId)) {
      if (user.role === 'teacher' && String(req.query.teacherId) !== String(user._id)) {
        return res.status(403).json({ error: 'Teachers can only view their own feedback' });
      }

      if (user.role === 'university') {
        const inScope = universityTeacherScope.some((id) => String(id) === String(req.query.teacherId));
        if (!inScope) {
          return res.status(403).json({ error: 'Teacher is outside your university scope' });
        }
      }

      query.teacherId = req.query.teacherId;
    }

    if (req.query.alertOnly === 'true' || req.query.alertOnly === '1') {
      query.alertFlag = true;
    }

    if (isNonEmptyString(req.query.sentiment)) {
      query.sentiment = req.query.sentiment;
    }

    if (isNonEmptyString(req.query.category)) {
      query.category = req.query.category;
    }

    const feedbacks = await Feedback.find(query)
      .populate('formId', 'title type subjectId')
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name email teacherCode')
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    if (user.role === 'university') {
      const sanitizedFeedbacks = feedbacks.map((item) => {
        const hideStudentIdentity = item.formId?.type === 'secret';
        const complaintText = item.formId?.type === 'complaint'
          ? (item.answers || []).find((ans) => isNonEmptyString(ans?.answer))?.answer || item.rawText || ''
          : '';

        return {
          _id: item._id,
          formId: item.formId,
          studentId: hideStudentIdentity ? null : item.studentId,
          teacherId: item.teacherId,
          subjectId: item.subjectId || item.formId?.subjectId || null,
          className: item.className || 'Unassigned',
          rating: item.rating,
          complaintText,
          sentiment: item.sentiment,
          category: item.category,
          suggestion: item.suggestion,
          alertFlag: item.alertFlag,
          alertReasons: item.alertReasons || [],
          createdAt: item.createdAt
        };
      });

      return res.json({ feedbacks: sanitizedFeedbacks });
    }

    return res.json({ feedbacks });
  } catch (err) { next(err); }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const days = Number.parseInt(req.query.days || '30', 10);
    const normalizedDays = Number.isNaN(days) || days < 1 ? 30 : days;
    const fromDate = new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000);

    const match = { createdAt: { $gte: fromDate } };

    if (user.role === 'teacher') {
      match.teacherId = user._id;
    } else if (user.role === 'university') {
      const teacherIds = await getTeacherScopeByUniversityUser(user._id);
      match.teacherId = { $in: teacherIds };
    } else {
      return res.status(403).json({ error: 'Analytics is available only for teacher and university roles' });
    }

    const sentimentAgg = await Feedback.aggregate([
      { $match: match },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } }
    ]);

    const categoryAgg = await Feedback.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const trendAgg = await Feedback.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const alertCount = await Feedback.countDocuments({ ...match, alertFlag: true });
    const totalFeedback = await Feedback.countDocuments(match);

    const subjectAgg = await Feedback.aggregate([
      { $match: match },
      { $group: { _id: '$subjectId', count: { $sum: 1 } } }
    ]);

    const classAgg = await Feedback.aggregate([
      { $match: match },
      { $group: { _id: '$className', count: { $sum: 1 } } }
    ]);

    const questionAgg = await Feedback.aggregate([
      { $match: match },
      { $unwind: '$answers' },
      {
        $group: {
          _id: '$answers.question',
          responseCount: { $sum: 1 },
          ratingCount: {
            $sum: {
              $cond: [{ $eq: ['$answers.answerType', 'rating'] }, 1, 0]
            }
          },
          averageRating: {
            $avg: {
              $cond: [{ $eq: ['$answers.answerType', 'rating'] }, { $toDouble: '$answers.answer' }, null]
            }
          }
        }
      },
      { $sort: { responseCount: -1, _id: 1 } }
    ]);

    const subjectIds = subjectAgg.filter((row) => row._id).map((row) => row._id);
    const subjectDocs = subjectIds.length > 0
      ? await Subject.find({ _id: { $in: subjectIds } }).select('name code')
      : [];
    const subjectMap = new Map(subjectDocs.map((subject) => [String(subject._id), subject]));

    const sentimentDistribution = { positive: 0, negative: 0, neutral: 0 };
    sentimentAgg.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(sentimentDistribution, row._id)) {
        sentimentDistribution[row._id] = row.count;
      }
    });

    const categoryDistribution = { teaching: 0, infrastructure: 0, 'course content': 0, general: 0 };
    categoryAgg.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(categoryDistribution, row._id)) {
        categoryDistribution[row._id] = row.count;
      }
    });

    const subjectDistribution = subjectAgg.map((row) => {
      const subject = row._id ? subjectMap.get(String(row._id)) : null;

      return {
        subjectId: row._id,
        subjectName: subject?.name || 'Unassigned',
        subjectCode: subject?.code || '',
        count: row.count
      };
    });

    const classDistribution = classAgg.map((row) => ({
      className: row._id || 'Unassigned',
      count: row.count
    }));

    const questionAnalysis = questionAgg.map((row) => ({
      question: row._id,
      responseCount: row.responseCount,
      ratingCount: row.ratingCount,
      averageRating: row.averageRating ? Number(row.averageRating.toFixed(2)) : null
    }));

    const feedbackTrends = trendAgg.map((row) => ({ date: row._id, count: row.count }));

    const negativePercentage = totalFeedback > 0 ? Math.round((sentimentDistribution.negative / totalFeedback) * 100) : 0;
    const threshold = Number.parseInt(process.env.NEGATIVE_THRESHOLD || '30', 10) || 30;
    const exceedsNegativeThreshold = negativePercentage > threshold;

    if (exceedsNegativeThreshold && user.role === 'teacher') {
      const teacher = await User.findById(user._id).select('name email');
      if (teacher && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        const { sendAlertEmail } = require('../services/emailService');
        await sendAlertEmail(teacher.email, teacher.name, negativePercentage);
      }
    }

    return res.json({
      sentimentDistribution,
      categoryDistribution,
      subjectDistribution,
      classDistribution,
      questionAnalysis,
      feedbackTrends,
      alertCount,
      totalFeedback,
      negativePercentage,
      exceedsNegativeThreshold
    });
  } catch (err) {
    return next(err);
  }
};
