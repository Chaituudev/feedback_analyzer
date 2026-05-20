const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Import routes
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/request');
const formRoutes = require('./routes/form');
const feedbackRoutes = require('./routes/feedback');
const subjectRoutes = require('./routes/subject');
const testRoutes = require('./routes/test');

app.use('/auth', authRoutes);
app.use('/form', formRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/subjects', subjectRoutes);
app.use('/test', testRoutes);
app.use('/', requestRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend' });
});

const shouldServeFrontend = process.env.SERVE_FRONTEND === 'true' || process.env.NODE_ENV === 'production';
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');

if (shouldServeFrontend && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA fallback: serve index.html on browser refresh for client-side routes.
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    const accept = String(req.headers.accept || '');
    if (!accept.includes('text/html')) return next();
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  // Keep errors consistent and avoid leaking internal details in production.
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

module.exports = app;
