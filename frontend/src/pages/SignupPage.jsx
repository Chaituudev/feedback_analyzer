import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { persistSession, signup } from '../services/auth';

function roleHome(role) {
  if (role === 'university') return '/university';
  if (role === 'teacher') return '/teacher';
  return '/student';
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await signup(form);
      persistSession(data.token, data.user);
      navigate(roleHome(data.user.role));
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="card form-card" onSubmit={handleSubmit}>
        <h2>Signup</h2>
        {error && <p className="error">{error}</p>}

        <label htmlFor="name">Name</label>
        <input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} required />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          required
        />

        <label htmlFor="role">Role</label>
        <select id="role" value={form.role} onChange={(e) => update('role', e.target.value)}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="university">University</option>
        </select>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Signup'}
        </button>

        <p>
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}
