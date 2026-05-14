# Frontend (React + Vite)

## Environment
Create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000
```

## Run

```
cd frontend
npm install
npm run dev
```

## Implemented Pages
- `/login`
- `/signup`
- `/university`
- `/teacher`
- `/student`
- `/forms/:formId`

## Structure
- `src/pages`
- `src/components`
- `src/services`

## Notes
- Axios is configured in `src/services/api.js`.
- JWT token is automatically attached to protected API calls.
- Dashboard charts use Chart.js and read `/feedback/analytics`.
