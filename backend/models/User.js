const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['university', 'teacher', 'student'], required: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  universityCode: { type: String, unique: true, sparse: true },
  teacherCode: { type: String, unique: true, sparse: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
