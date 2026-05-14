import api from './api';

export async function signup(payload) {
  const { data } = await api.post('/auth/signup', payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export function persistSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('role', user.role);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
}
