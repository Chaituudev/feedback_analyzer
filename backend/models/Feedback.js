const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5 },
  answers: [{ type: mongoose.Schema.Types.Mixed, required: true }],
  rawText: { type: String, default: '' },
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'neutral' },
  category: { type: String },
  suggestion: { type: String, default: '' },
  alertFlag: { type: Boolean, default: false },
  alertReasons: [{ type: String }]
}, { timestamps: true });

feedbackSchema.index({ teacherId: 1, createdAt: -1 });
feedbackSchema.index({ alertFlag: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
