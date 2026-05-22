function normalizeRole(role) {
  if (role === 'university') {
    return 'admin';
  }

  return role;
}

function isAdminRole(role) {
  return normalizeRole(role) === 'admin';
}

function matchesAllowedRole(role, allowedRoles) {
  const normalizedRole = normalizeRole(role);
  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
}

module.exports = {
  normalizeRole,
  isAdminRole,
  matchesAllowedRole
};