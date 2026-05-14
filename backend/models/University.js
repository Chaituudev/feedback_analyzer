const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  universityCode: { type: String, required: true, unique: true },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('University', universitySchema);
