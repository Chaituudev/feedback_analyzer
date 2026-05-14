const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const University = require('../models/University');
const { generateUniqueCode } = require('../utils/codeGenerator');
const { isNonEmptyString, normalizeEmail } = require('../utils/validators');

const ALLOWED_ROLES = ['university', 'teacher', 'student'];

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    universityId: user.universityId,
    teacherId: user.teacherId,
    universityCode: user.universityCode,
    teacherCode: user.teacherCode
  };
}

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(role)) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);

    const payload = {
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
      role
    };

    if (role === 'university') {
      payload.universityCode = await generateUniqueCode(User, 'universityCode', 'UNI');
    }

    const user = new User(payload);
    await user.save();

    if (role === 'university') {
      await University.create({
        name: user.name,
        universityCode: user.universityCode,
        teachers: [],
        students: []
      });
    }

    const token = signToken(user);
    res.status(201).json({ message: 'Signup successful', token, user: toPublicUser(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, role: user.role, user: toPublicUser(user) });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
};

exports.getUniversityTeachers = async (req, res, next) => {
  try {
    const universityUser = await User.findById(req.user.id).select('universityCode role');

    if (!universityUser || universityUser.role !== 'university') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const university = await University.findOne({ universityCode: universityUser.universityCode }).select('_id');
    if (!university) {
      return res.status(404).json({ error: 'University not found' });
    }

    const teachers = await User.find({ role: 'teacher', universityId: university._id })
      .select('name email teacherCode universityId')
      .sort({ createdAt: -1 });

    return res.json({ teachers });
  } catch (err) {
    return next(err);
  }
};
