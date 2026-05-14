const axios = require('axios');

const base = 'http://localhost:5000';

function uniq(prefix) {
  return `${prefix}.${Date.now()}@example.com`;
}

async function signupUser(payload) {
  const { data } = await axios.post(`${base}/auth/signup`, payload);
  return data;
}

async function checkWithToken(label, token, endpoints) {
  console.log(`\n[${label}]`);
  for (const ep of endpoints) {
    try {
      const { data, status } = await axios.get(`${base}${ep}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const keys = data && typeof data === 'object' ? Object.keys(data).join(',') : typeof data;
      console.log(`OK ${ep} -> ${status} keys: ${keys}`);
    } catch (err) {
      const status = err.response?.status || 'NO_STATUS';
      const body = err.response?.data || err.message;
      console.log(`FAIL ${ep} -> ${status} body: ${JSON.stringify(body)}`);
    }
  }
}

async function run() {
  try {
    const university = await signupUser({
      name: 'University Test',
      email: uniq('university'),
      password: 'password123',
      role: 'university'
    });

    const teacher = await signupUser({
      name: 'Teacher Test',
      email: uniq('teacher'),
      password: 'password123',
      role: 'teacher'
    });

    await checkWithToken('TEACHER', teacher.token, [
      '/requests?scope=received&status=pending',
      '/requests?scope=sent',
      '/feedback/analytics',
      '/feedback?alertOnly=true',
      '/auth/me'
    ]);

    await checkWithToken('UNIVERSITY', university.token, [
      '/requests?scope=received&status=pending',
      '/feedback/analytics',
      '/auth/teachers'
    ]);
  } catch (err) {
    console.error('Fatal:', err.response?.status, err.response?.data || err.message);
    process.exitCode = 1;
  }
}

run();
