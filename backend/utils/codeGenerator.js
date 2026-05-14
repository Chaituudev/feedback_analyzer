function randomPart(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';

  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

async function generateUniqueCode(model, fieldName, prefix, length = 6) {
  // Retry loop is acceptable here because collisions are rare with this space.
  for (let i = 0; i < 25; i += 1) {
    const code = `${prefix}-${randomPart(length)}`;
    const exists = await model.exists({ [fieldName]: code });
    if (!exists) {
      return code;
    }
  }

  throw new Error(`Unable to generate unique ${fieldName}`);
}

module.exports = {
  generateUniqueCode
};
