# Backend API (Node.js + Express + MongoDB)

## Environment
Create or update root `.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/feedback_analyzer
JWT_SECRET=replace_with_strong_secret
AI_SERVICE_URL=http://localhost:8000
PORT=5000
```

## Run

```
cd backend
npm install
npm run dev
```

## Core Endpoints

### Auth
- POST `/auth/signup`
- POST `/auth/login`
- GET `/auth/me`
- GET `/auth/teachers` (university)

### Request System
- POST `/request/university` (teacher)
- POST `/request/teacher` (student)
- GET `/requests`
- POST `/approve`
- POST `/reject`

### Form System
- POST `/form` (university)
- GET `/form`
- GET `/form/:formId`

### Feedback + Analytics
- POST `/feedback` (student)
- GET `/feedback`
- GET `/feedback/analytics`

### Test Routes
- GET `/test/ping`
- GET `/test/auth-check`

## Working Flow (Happy Path)
1. University signs up and gets a `universityCode`.
2. Teacher signs up and calls `/request/university` with that code.
3. University approves via `/approve`.
4. Teacher receives `teacherCode`.
5. Student signs up and requests teacher via `/request/teacher`.
6. Teacher approves via `/approve`.
7. University creates forms via `/form` assigned to the teacher.
8. Student fetches forms via `/form` and submits via `/feedback`.
9. Backend calls AI layer `/analyze`, stores sentiment/category/alert in MongoDB.
10. Teacher/University dashboards read `/feedback/analytics` and `/feedback`.
