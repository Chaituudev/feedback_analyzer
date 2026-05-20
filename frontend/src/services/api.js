import axios from 'axios';

function stripTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(raw);

  if (raw && !(import.meta.env.PROD && isLocalhost)) {
    return stripTrailingSlash(raw);
  }

  if (import.meta.env.PROD) {
    if (raw && isLocalhost) {
      console.warn(
        'VITE_API_BASE_URL points to localhost in a production build; falling back to same-origin.'
      );
    }

    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    return '';
  }

  return 'http://localhost:5000';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
