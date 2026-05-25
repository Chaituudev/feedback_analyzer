const Request = require('../models/Request');
const User = require('../models/User');
const University = require('../models/University');
const Subject = require('../models/Subject');
const { generateUniqueCode } = require('../utils/codeGenerator');
const { isNonEmptyString, isValidObjectId } = require('../utils/validators');
const { normalizeRole } = require('../utils/roles');

async function getUniversityByUser(universityUserId) {
  const universityUser = await User.findById(universityUserId).select('universityCode role');
  if (!universityUser || normalizeRole(universityUser.role) !== 'admin' || !universityUser.universityCode) {
    return null;
  }

  return University.findOne({ universityCode: universityUser.universityCode });
}

exports.teacherToUniversity = async (req, res, next) => {
  try {
    const { universityCode } = req.body;

    if (!isNonEmptyString(universityCode)) {
      return res.status(400).json({ error: 'universityCode is required' });
    }

    const sender = await User.findById(req.user.id);
    if (!sender || sender.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can send university requests' });
    }

    if (sender.universityId) {
      return res.status(409).json({ error: 'Teacher is already assigned to a university' });
    }

    const receiver = await User.findOne({ role: { $in: ['admin', 'university'] }, universityCode: universityCode.trim() });
    if (!receiver) {
      return res.status(404).json({ error: 'Invalid universityCode' });
    }

    const duplicate = await Request.findOne({
      type: 'teacher_to_university',
      senderId: sender._id,
      receiverId: receiver._id,
      status: 'pending'
    });

    if (duplicate) {
      return res.status(409).json({ error: 'A pending request already exists' });
    }

    const request = await Request.create({
      type: 'teacher_to_university',
      senderId: sender._id,
      receiverId: receiver._id,
      status: 'pending'
    });

    return res.status(201).json({ message: 'Teacher request sent', request });
  } catch (err) { next(err); }
};

exports.teacherToSubject = async (req, res, next) => {
  try {
    const { subjectId } = req.body;

    if (!isValidObjectId(subjectId)) {
      return res.status(400).json({ error: 'Valid subjectId is required' });
    }

    const sender = await User.findById(req.user.id);
    if (!sender || sender.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can request subjects' });
    }

    if (!sender.universityId) {
      return res.status(400).json({ error: 'Teacher must be assigned to a university first' });
    }

    const university = await University.findById(sender.universityId).select('universityCode');
    if (!university) {
      return res.status(404).json({ error: 'University not found' });
    }

    const receiver = await User.findOne({ role: { $in: ['admin', 'university'] }, universityCode: university.universityCode });
    if (!receiver) {
      return res.status(404).json({ error: 'University account not found' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject || !subject.isActive) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (String(subject.universityId) !== String(sender.universityId)) {
      return res.status(403).json({ error: 'Subject does not belong to your university' });
    }

    const duplicate = await Request.findOne({
      type: 'teacher_to_subject',
      senderId: sender._id,
      receiverId: receiver._id,
      subjectId: subject._id,
      status: 'pending'
    });

    if (duplicate) {
      return res.status(409).json({ error: 'A pending subject request already exists' });
    }

    const request = await Request.create({
      type: 'teacher_to_subject',
      senderId: sender._id,
      receiverId: receiver._id,
      subjectId: subject._id,
      status: 'pending'
    });

    return res.status(201).json({ message: 'Subject request sent', request });
  } catch (err) {
    return next(err);
  }
};

exports.studentToTeacher = async (req, res, next) => {
  try {
    const rawTeacherIds = [];
    if (isValidObjectId(req.body.teacherId)) {
      rawTeacherIds.push(req.body.teacherId);
    }

    if (Array.isArray(req.body.teacherIds)) {
      rawTeacherIds.push(...req.body.teacherIds.filter((id) => isValidObjectId(id)));
    } else if (isNonEmptyString(req.body.teacherIds)) {
      rawTeacherIds.push(...req.body.teacherIds.split(/[\n,]+/).map((id) => id.trim()).filter((id) => isValidObjectId(id)));
    }

    if (rawTeacherIds.length === 0 && isNonEmptyString(req.body.teacherCode)) {
      const receiver = await User.findOne({ role: 'teacher', teacherCode: req.body.teacherCode.trim() }).select('_id');
      if (receiver) rawTeacherIds.push(String(receiver._id));
    }

    const teacherIds = [...new Set(rawTeacherIds.map((id) => String(id)))];

    if (teacherIds.length === 0) {
      return res.status(400).json({ error: 'teacherId or teacherIds is required' });
    }

    const sender = await User.findById(req.user.id);
    if (!sender || sender.role !== 'student') {
      return res.status(403).json({ error: 'Only students can send teacher requests' });
    }

    const assignedSet = new Set([
      ...(Array.isArray(sender.teacherIds) ? sender.teacherIds : []),
      sender.teacherId
    ].filter(Boolean).map((id) => String(id)));

    const createdRequests = [];
    const skippedTeacherIds = [];

    for (const teacherId of teacherIds) {
      const receiver = await User.findById(teacherId).select('role teacherCode');
      if (!receiver || receiver.role !== 'teacher') {
        skippedTeacherIds.push(teacherId);
        continue;
      }

      if (assignedSet.has(String(receiver._id))) {
        skippedTeacherIds.push(String(receiver._id));
        continue;
      }

      const duplicate = await Request.findOne({
        type: 'student_to_teacher',
        senderId: sender._id,
        receiverId: receiver._id,
        status: 'pending'
      });

      if (duplicate) {
        skippedTeacherIds.push(String(receiver._id));
        continue;
      }

      const request = await Request.create({
        type: 'student_to_teacher',
        senderId: sender._id,
        receiverId: receiver._id,
        status: 'pending'
      });

      createdRequests.push(request);
    }

    if (createdRequests.length === 0) {
      return res.status(409).json({ error: 'No new teacher requests were created' });
    }

    return res.status(201).json({
      message: 'Student request(s) sent',
      requests: createdRequests,
      skippedTeacherIds
    });
  } catch (err) { next(err); }
};

exports.getRequests = async (req, res, next) => {
  try {
    const { scope = 'received', status } = req.query;

    const query = {};

    if (scope === 'sent') {
      query.senderId = req.user.id;
    } else if (scope === 'all') {
      query.$or = [{ senderId: req.user.id }, { receiverId: req.user.id }];
    } else {
      query.receiverId = req.user.id;
    }

    if (isNonEmptyString(status)) {
      query.status = status;
    }

    const requests = await Request.find(query)
      .populate('senderId', 'name email role universityCode teacherCode')
      .populate('receiverId', 'name email role universityCode teacherCode')
      .populate('subjectId', 'name code')
      .sort({ createdAt: -1 });

    return res.json({ requests });
  } catch (err) { next(err); }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const { requestId } = req.body;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({ error: 'Valid requestId is required' });
    }

    const request = await Request.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (String(request.receiverId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the receiver can approve this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    const sender = await User.findById(request.senderId);
    const receiver = await User.findById(request.receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'Sender or receiver no longer exists' });
    }

    if (request.type === 'teacher_to_university') {
      if (normalizeRole(receiver.role) !== 'admin' || sender.role !== 'teacher') {
        return res.status(400).json({ error: 'Role mismatch for teacher_to_university request' });
      }

      const university = await getUniversityByUser(receiver._id);
      if (!university) {
        return res.status(404).json({ error: 'University record not found for approver' });
      }

      sender.universityId = university._id;

      if (!sender.teacherCode) {
        sender.teacherCode = await generateUniqueCode(User, 'teacherCode', 'TCH');
      }

      await sender.save();

      if (!university.teachers.some((id) => String(id) === String(sender._id))) {
        university.teachers.push(sender._id);
        await university.save();
      }
    }

    if (request.type === 'student_to_teacher') {
      if (receiver.role !== 'teacher' || sender.role !== 'student') {
        return res.status(400).json({ error: 'Role mismatch for student_to_teacher request' });
      }

      if (!receiver.teacherCode) {
        receiver.teacherCode = await generateUniqueCode(User, 'teacherCode', 'TCH');
      }

      // Add this teacher to the student's teacherIds array (support multiple teachers)
      if (!Array.isArray(sender.teacherIds)) sender.teacherIds = [];
      const teacherIdStr = String(receiver._id);
      if (!sender.teacherIds.some((id) => String(id) === teacherIdStr)) {
        sender.teacherIds.push(receiver._id);
      }

      // keep legacy `teacherId` for single-teacher flows if unset
      if (!sender.teacherId) {
        sender.teacherId = receiver._id;
      }

      if (receiver.universityId) {
        sender.universityId = receiver.universityId;
      }

      if (!Array.isArray(receiver.students)) receiver.students = [];
      if (!receiver.students.some((id) => String(id) === String(sender._id))) {
        receiver.students.push(sender._id);
      }

      await receiver.save();
      await sender.save();

      if (receiver.universityId) {
        const university = await University.findById(receiver.universityId);
        if (university) {
          if (!Array.isArray(university.students)) university.students = [];
          if (!university.students.some((id) => String(id) === String(sender._id))) {
            university.students.push(sender._id);
            await university.save();
          }
        }
      }
    }

    if (request.type === 'teacher_to_subject') {
      if (normalizeRole(receiver.role) !== 'admin' || sender.role !== 'teacher') {
        return res.status(400).json({ error: 'Role mismatch for teacher_to_subject request' });
      }

      const subject = await Subject.findById(request.subjectId);
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      const university = await getUniversityByUser(receiver._id);
      if (!university || String(subject.universityId) !== String(university._id)) {
        return res.status(403).json({ error: 'Subject does not belong to the approving university' });
      }

      if (!sender.subjects.some((id) => String(id) === String(subject._id))) {
        sender.subjects.push(subject._id);
      }

      if (!subject.teachers.some((id) => String(id) === String(sender._id))) {
        subject.teachers.push(sender._id);
      }

      await sender.save();
      await subject.save();

      if (university && !university.subjects.some((id) => String(id) === String(subject._id))) {
        university.subjects.push(subject._id);
        await university.save();
      }
    }

    request.status = 'approved';
    await request.save();

    return res.json({ message: 'Request approved', request });
  } catch (err) { next(err); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { requestId } = req.body;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({ error: 'Valid requestId is required' });
    }

    const request = await Request.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (String(request.receiverId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the receiver can reject this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    request.status = 'rejected';
    await request.save();

    return res.json({ message: 'Request rejected', request });
  } catch (err) { next(err); }
};

exports.leaveUniversity = async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select('role universityId');

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can leave a university' });
    }

    if (!teacher.universityId) {
      return res.status(400).json({ error: 'Teacher is not assigned to a university' });
    }

    const university = await University.findById(teacher.universityId);
    const teacherId = teacher._id;

    teacher.universityId = null;
    await teacher.save();

    const students = await User.find({ role: 'student', teacherId }).select('_id');
    const studentIds = students.map((s) => s._id);

    if (studentIds.length > 0) {
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $unset: { universityId: 1 } }
      );
    }

    if (university) {
      university.teachers = (university.teachers || []).filter((id) => String(id) !== String(teacherId));

      if (studentIds.length > 0) {
        const studentIdSet = new Set(studentIds.map((id) => String(id)));
        university.students = (university.students || []).filter((id) => !studentIdSet.has(String(id)));
      }

      await university.save();
    }

    return res.json({ message: 'You have left the university successfully' });
  } catch (err) {
    return next(err);
  }
};
