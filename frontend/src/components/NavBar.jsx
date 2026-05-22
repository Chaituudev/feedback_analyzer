import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession } from '../services/auth';

export default function NavBar({ title, userLabel, showDashboardLink = true }) {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  const onLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1>{title}</h1>
      </div>
      {userLabel && <div className="navbar-center">{userLabel}</div>}
      <div className="navbar-right">
        {showDashboardLink && role === 'student' && <Link to="/student">Dashboard</Link>}
        {showDashboardLink && role === 'teacher' && <Link to="/teacher">Dashboard</Link>}
        {showDashboardLink && (role === 'admin' || role === 'university') && <Link to="/admin">Dashboard</Link>}
        <button type="button" className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
