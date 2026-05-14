import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession } from '../services/auth';

export default function NavBar({ title }) {
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
      <div className="navbar-right">
        {role === 'student' && <Link to="/student">Dashboard</Link>}
        {role === 'teacher' && <Link to="/teacher">Dashboard</Link>}
        {role === 'university' && <Link to="/university">Dashboard</Link>}
        <button type="button" className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
