const mongoose = require('mongoose');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

module.exports = {
  isNonEmptyString,
  isValidObjectId,
  normalizeEmail
};
