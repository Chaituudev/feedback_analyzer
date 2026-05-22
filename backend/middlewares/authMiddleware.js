const jwt = require('jsonwebtoken');
const { normalizeRole, matchesAllowedRole } = require('../utils/roles');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      ...payload,
      role: normalizeRole(payload.role)
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !matchesAllowedRole(req.user.role, allowedRoles)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles
};
