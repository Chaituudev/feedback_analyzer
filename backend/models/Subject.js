const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, sparse: true, trim: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

subjectSchema.index({ universityId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);