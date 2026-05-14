import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, persistSession } from '../services/auth';

function roleHome(role) {
  if (role === 'university') return '/university';
  if (role === 'teacher') return '/teacher';
  return '/student';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login({ email, password });
      persistSession(data.token, data.user);
      navigate(roleHome(data.user.role));
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="card form-card" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <p className="error">{error}</p>}

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <p>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </main>
  );
}
