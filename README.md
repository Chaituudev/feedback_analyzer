# AI-Powered Student Feedback Analyzer

This project is a production-ready, multi-role platform for universities, teachers, and students to manage and analyze feedback using AI.

## Project Structure

- frontend/ (React app)
- backend/ (Node.js + Express API)
- ai-layer/ (Python FastAPI NLP service)
- .env (shared environment variables)

## Tech Stack
- Frontend: React (Vite), Axios, React Router, Chart.js
- Backend: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
- AI Layer: Python, FastAPI, TextBlob/Transformers

## Features
- Multi-role: University, Teacher, Student
- Request–Approval model for relationships
- AI-powered feedback analysis (sentiment, category, alerts)
- JWT authentication & role-based access
- MVC backend structure
- End-to-end flow: Student -> Feedback -> AI -> MongoDB -> Dashboard charts

## Running the Project

### Backend
```
cd backend
npm install
npm run dev
```

### Frontend
```
cd frontend
npm install
npm run dev
```

### AI Layer
```
cd ai-layer
venv\Scripts\activate
uvicorn main:app --reload
```

### Shared Root Environment
```
MONGO_URI=mongodb://127.0.0.1:27017/feedback_analyzer
JWT_SECRET=replace_with_strong_secret
AI_SERVICE_URL=http://localhost:8000
PORT=5000
ANALYSIS_ENGINE=heuristic
GROQ_API_KEY=your_groq_api_key_optional
GROQ_MODEL=llama-3.1-8b-instant
```

Use `ANALYSIS_ENGINE=heuristic` in production on low-memory hosts. Set `ANALYSIS_ENGINE=transformers` only if the deployment has enough RAM for the Xenova model weights.
If `GROQ_API_KEY` is set, feedback analysis will use Groq first and fall back to local logic when the API is unavailable.
Low ratings now influence the stored sentiment, so a 1-2 score will be treated as negative even if the written comment is vague.

## Core Backend Endpoints

### Auth
- POST `/auth/signup`
- POST `/auth/login`
- GET `/auth/me`

### Request System
- POST `/request/university`
- POST `/request/teacher`
- GET `/requests`
- POST `/approve`
- POST `/reject`

### Form System
- POST `/form`
- GET `/form`
- GET `/form/:formId`

### Feedback and Dashboard
- POST `/feedback`
- GET `/feedback`
- GET `/feedback/analytics`

### Diagnostics
- GET `/health`
- GET `/test/ping`
- GET `/test/auth-check`

## One Complete Working Flow
1. University signs up and gets a generated `universityCode`.
2. Teacher signs up and sends `/request/university` with that code.
3. University approves teacher request via `/approve`.
4. Student signs up and sends `/request/teacher` with teacher code.
5. Teacher approves student request via `/approve`.
6. University creates and assigns forms via `/form`.
7. Student loads `/form`, fills `/forms/:formId`, submits `/feedback`.
8. Backend calls AI `/analyze`, stores sentiment/category/alert in MongoDB.
9. Teacher and University dashboards load analytics via `/feedback/analytics` and alerts via `/feedback?alertOnly=true`.

---

See each folder for more details and extend as needed for production.
