const Request = require('../models/Request');
const User = require('../models/User');
const University = require('../models/University');
const { generateUniqueCode } = require('../utils/codeGenerator');
const { isNonEmptyString, isValidObjectId } = require('../utils/validators');

async function getUniversityByUser(universityUserId) {
  const universityUser = await User.findById(universityUserId).select('universityCode role');
  if (!universityUser || universityUser.role !== 'university' || !universityUser.universityCode) {
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

    const receiver = await User.findOne({ role: 'university', universityCode: universityCode.trim() });
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

exports.studentToTeacher = async (req, res, next) => {
  try {
    const { teacherCode } = req.body;

    if (!isNonEmptyString(teacherCode)) {
      return res.status(400).json({ error: 'teacherCode is required' });
    }

    const sender = await User.findById(req.user.id);
    if (!sender || sender.role !== 'student') {
      return res.status(403).json({ error: 'Only students can send teacher requests' });
    }

    if (sender.teacherId) {
      return res.status(409).json({ error: 'Student is already assigned to a teacher' });
    }

    const receiver = await User.findOne({ role: 'teacher', teacherCode: teacherCode.trim() });
    if (!receiver) {
      return res.status(404).json({ error: 'Invalid teacherCode' });
    }

    const duplicate = await Request.findOne({
      type: 'student_to_teacher',
      senderId: sender._id,
      receiverId: receiver._id,
      status: 'pending'
    });

    if (duplicate) {
      return res.status(409).json({ error: 'A pending request already exists' });
    }

    const request = await Request.create({
      type: 'student_to_teacher',
      senderId: sender._id,
      receiverId: receiver._id,
      status: 'pending'
    });

    return res.status(201).json({ message: 'Student request sent', request });
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
      if (receiver.role !== 'university' || sender.role !== 'teacher') {
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

      sender.teacherId = receiver._id;

      if (receiver.universityId) {
        sender.universityId = receiver.universityId;
      }

      await receiver.save();
      await sender.save();

      if (!receiver.students.some((id) => String(id) === String(sender._id))) {
        receiver.students.push(sender._id);
        await receiver.save();
      }

      if (receiver.universityId) {
        const university = await University.findById(receiver.universityId);
        if (university && !university.students.some((id) => String(id) === String(sender._id))) {
          university.students.push(sender._id);
          await university.save();
        }
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
