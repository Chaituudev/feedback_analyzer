const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [{ type: mongoose.Schema.Types.Mixed, required: true }],
  type: { type: String, enum: ['public', 'secret', 'complaint'], required: true },
  templateKey: { type: String, trim: true },
  ratingScale: {
    min: { type: Number, min: 1, default: 1 },
    max: { type: Number, min: 1, default: 5 }
  },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  assignedTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

formSchema.pre('validate', function preValidate() {
  if (this.ratingScale && this.ratingScale.max < this.ratingScale.min) {
    this.invalidate('ratingScale.max', 'ratingScale.max must be greater than or equal to ratingScale.min');
  }
});

formSchema.index({ assignedTeachers: 1, type: 1 });

module.exports = mongoose.model('Form', formSchema);
