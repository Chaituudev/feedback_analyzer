import React from 'react';
import { Navigate } from 'react-router-dom';

function roleHome(role) {
  if (role === 'admin' || role === 'university') return '/admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'student') return '/student';
  return '/login';
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={roleHome(role)} replace />;
  }

  return children;
}
