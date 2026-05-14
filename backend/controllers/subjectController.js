const Subject = require('../models/Subject');
const User = require('../models/User');
const University = require('../models/University');
const { generateUniqueCode } = require('../utils/codeGenerator');
const { isNonEmptyString } = require('../utils/validators');

async function getUniversityByUser(userId) {
  const user = await User.findById(userId).select('role universityCode universityId');

  if (!user) {
    return null;
  }

  if (user.role === 'university' && user.universityCode) {
    return University.findOne({ universityCode: user.universityCode });
  }

  if (user.universityId) {
    return University.findById(user.universityId);
  }

  return null;
}

exports.getSubjects = async (req, res, next) => {
  try {
    const university = await getUniversityByUser(req.user.id);

    if (!university) {
      return res.json({ subjects: [] });
    }

    const subjects = await Subject.find({ universityId: university._id, isActive: true })
      .populate('teachers', 'name email teacherCode')
      .sort({ createdAt: -1 });

    return res.json({ subjects });
  } catch (err) {
    return next(err);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: 'name is required' });
    }

    const university = await getUniversityByUser(req.user.id);
    if (!university) {
      return res.status(403).json({ error: 'Only university users can create subjects' });
    }

    const duplicate = await Subject.findOne({ universityId: university._id, name: name.trim() });
    if (duplicate) {
      return res.status(409).json({ error: 'Subject already exists' });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: await generateUniqueCode(Subject, 'code', 'SUB'),
      universityId: university._id,
      createdBy: req.user.id,
      teachers: []
    });

    if (!university.subjects.some((id) => String(id) === String(subject._id))) {
      university.subjects.push(subject._id);
      await university.save();
    }

    return res.status(201).json({ message: 'Subject created', subject });
  } catch (err) {
    return next(err);
  }
};