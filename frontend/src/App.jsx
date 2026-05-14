import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PageErrorBoundary from './components/PageErrorBoundary';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UniversityDashboard from './pages/UniversityDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import FeedbackFormPage from './pages/FeedbackFormPage';

function roleHome(role) {
  if (role === 'university') return '/university';
  if (role === 'teacher') return '/teacher';
  if (role === 'student') return '/student';
  return '/login';
}

function RoleRedirect() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={roleHome(role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/university"
        element={(
          <ProtectedRoute allowedRoles={['university']}>
            <PageErrorBoundary>
              <UniversityDashboard />
            </PageErrorBoundary>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/teacher"
        element={(
          <ProtectedRoute allowedRoles={['teacher']}>
            <PageErrorBoundary>
              <TeacherDashboard />
            </PageErrorBoundary>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/student"
        element={(
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/forms/:formId"
        element={(
          <ProtectedRoute allowedRoles={['student']}>
            <FeedbackFormPage />
          </ProtectedRoute>
        )}
      />

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}
