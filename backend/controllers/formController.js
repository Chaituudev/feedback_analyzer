const Form = require('../models/Form');
const User = require('../models/User');
const University = require('../models/University');
const Subject = require('../models/Subject');
const { isNonEmptyString, isValidObjectId } = require('../utils/validators');
const { getTemplateList, getTemplate } = require('../data/formTemplates');
const { normalizeRole } = require('../utils/roles');

const CREATE_FORM_TYPES = ['public', 'secret'];
const DASHBOARD_FORM_TYPES = ['public', 'secret'];

async function getUniversityFromUser(userId) {
  const universityUser = await User.findById(userId).select('universityCode role');
  if (!universityUser || normalizeRole(universityUser.role) !== 'admin' || !universityUser.universityCode) {
    return null;
  }

  return University.findOne({ universityCode: universityUser.universityCode });
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) {
    return [];
  }

  const allowedAnswerTypes = new Set(['paragraph', 'rating']);

  function normalizeQuestionRatingScale(ratingScale) {
    const min = Number.parseInt(ratingScale?.min ?? 1, 10);
    const max = Number.parseInt(ratingScale?.max ?? 5, 10);

    if (Number.isNaN(min) || Number.isNaN(max)) {
      return { min: 1, max: 5 };
    }

    if (min < 1 || max < min) {
      return { min: 1, max: 5 };
    }

    return { min, max };
  }

  return questions
    .map((q) => {
      if (typeof q === 'string') {
        const text = q.trim();
        if (!text) return null;
        return { text, answerType: 'paragraph' };
      }

      if (!q || typeof q !== 'object') {
        return null;
      }

      const textRaw = q.text ?? q.question ?? '';
      const text = String(textRaw).trim();
      if (!text) {
        return null;
      }

      const answerTypeRaw = String(q.answerType ?? q.type ?? 'paragraph').toLowerCase();
      const answerType = allowedAnswerTypes.has(answerTypeRaw) ? answerTypeRaw : 'paragraph';
      const ratingScale = answerType === 'rating'
        ? normalizeQuestionRatingScale(q.ratingScale || q.rating || q.scale)
        : null;

      return { text, answerType, ratingScale };
    })
    .filter(Boolean);
}

function normalizeRatingScale(ratingScale) {
  const minRaw = ratingScale?.min ?? 1;
  const maxRaw = ratingScale?.max ?? 5;

  const min = Number.parseInt(minRaw, 10);
  const max = Number.parseInt(maxRaw, 10);

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return null;
  }

  if (min < 1 || max < min || max > 10) {
    return null;
  }

  return { min, max };
}

exports.createForm = async (req, res, next) => {
  try {
    const {
      title,
      questions,
      type = 'public',
      assignedTeacher,
      subjectId
    } = req.body;

    if (!isNonEmptyString(title) || !isNonEmptyString(type)) {
      return res.status(400).json({ error: 'title and type are required' });
    }

    if (!CREATE_FORM_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid form type' });
    }

    const normalizedQuestions = normalizeQuestions(questions);
    if (normalizedQuestions.length === 0) {
      return res.status(400).json({ error: 'questions must contain at least one non-empty question' });
    }

    const university = await getUniversityFromUser(req.user.id);
    if (!university) {
      return res.status(403).json({ error: 'Only university users can create forms' });
    }

    const hasAssignedTeacher = isValidObjectId(assignedTeacher);
    const hasSubject = isValidObjectId(subjectId);

    if (!hasAssignedTeacher && !hasSubject) {
      return res.status(400).json({ error: 'assignedTeacher or subjectId is required' });
    }

    let subject = null;
    if (hasSubject) {
      subject = await Subject.findById(subjectId);
      if (!subject || String(subject.universityId) !== String(university._id)) {
        return res.status(403).json({ error: 'Subject does not belong to your university' });
      }
    }

    let teacher = null;
    if (hasAssignedTeacher) {
      teacher = await User.findById(assignedTeacher);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({ error: 'Assigned teacher not found' });
      }

      if (!teacher.universityId || String(teacher.universityId) !== String(university._id)) {
        return res.status(403).json({ error: 'Teacher does not belong to your university' });
      }
    }

    if (teacher && subject) {
      const teacherSubjectIds = new Set((teacher.subjects || []).map((item) => String(item)));
      if (!teacherSubjectIds.has(String(subject._id))) {
        return res.status(403).json({ error: 'Selected subject is not assigned to this teacher' });
      }
    }

    const normalizedAssignedTeacher = teacher ? teacher._id : null;

    const form = await Form.create({
      title: title.trim(),
      questions: normalizedQuestions,
      type,
      subjectId: subject ? subject._id : undefined,
      assignedTeacher: normalizedAssignedTeacher,
      createdBy: req.user.id,
      isActive: true
    });

    return res.status(201).json({ message: 'Form created', form });
  } catch (err) { next(err); }
};

exports.getForms = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role teacherId subjectId subjects');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const query = {
      isActive: true,
      type: { $in: DASHBOARD_FORM_TYPES }
    };

    if (normalizeRole(user.role) === 'admin') {
      query.createdBy = user._id;
    } else if (user.role === 'teacher') {
      const subjectIds = Array.isArray(user.subjects) ? user.subjects : [];
      query.$or = [{ assignedTeacher: user._id }];

      if (subjectIds.length > 0) {
        query.$or.push({ subjectId: { $in: subjectIds } });
      }
    } else if (user.role === 'student') {
      if (!user.teacherId) {
        return res.json({ forms: [] });
      }

      const orFilters = [{ assignedTeacher: user.teacherId }];

      if (user.subjectId) {
        orFilters.push({ subjectId: user.subjectId });
      }

      query.$or = orFilters;
    }

    const forms = await Form.find(query)
      .populate('assignedTeacher', 'name email teacherCode')
      .populate('subjectId', 'name code')
      .sort({ createdAt: -1 });

    return res.json({ forms });
  } catch (err) { next(err); }
};

exports.getFormById = async (req, res, next) => {
  try {
    const { formId } = req.params;
    if (!isValidObjectId(formId)) {
      return res.status(400).json({ error: 'Valid formId is required' });
    }

    const form = await Form.findById(formId)
      .populate('assignedTeacher', 'name email teacherCode')
      .populate('subjectId', 'name code');

    if (!form || !form.isActive) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.type === 'complaint') {
      return res.status(403).json({ error: 'Complaint is submitted from the student dashboard' });
    }

    const user = await User.findById(req.user.id).select('role teacherId subjectId subjects');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const assignedTeacherId = form.assignedTeacher && form.assignedTeacher._id
      ? form.assignedTeacher._id
      : form.assignedTeacher;

    if (normalizeRole(user.role) === 'admin' && String(form.createdBy) !== String(user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const formSubjectId = form.subjectId && form.subjectId._id ? form.subjectId._id : form.subjectId;

    if (
      user.role === 'teacher' &&
      form.type !== 'complaint' &&
      String(assignedTeacherId) !== String(user._id) &&
      (!formSubjectId || !Array.isArray(user.subjects) || !user.subjects.some((subject) => String(subject) === String(formSubjectId)))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (
      user.role === 'student' &&
      form.type !== 'complaint' &&
      (!user.teacherId || (String(assignedTeacherId) !== String(user.teacherId) && String(formSubjectId || '') !== String(user.subjectId || '')))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ form });
  } catch (err) {
    return next(err);
  }
};

exports.deleteForm = async (req, res, next) => {
  try {
    const { formId } = req.params;

    if (!isValidObjectId(formId)) {
      return res.status(400).json({ error: 'Valid formId is required' });
    }

    const user = await User.findById(req.user.id).select('role');
    if (!user || normalizeRole(user.role) !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can delete forms' });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    form.isActive = false;
    await form.save();

    return res.json({ message: 'Form deleted', formId });
  } catch (err) {
    return next(err);
  }
};

exports.getFormTemplates = async (req, res, next) => {
  try {
    const templates = getTemplateList();
    return res.json({ templates });
  } catch (err) {
    next(err);
  }
};

exports.getFormTemplateById = async (req, res, next) => {
  try {
    const { templateId } = req.params;

    const template = getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ template });
  } catch (err) {
    next(err);
  }
};
