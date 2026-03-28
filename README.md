# FantasyLeague Tracker

Initial implementation scaffold for a private fantasy cricket season tracker.

## Monorepo Layout

- `frontend`: Next.js app (dark-first UI shell with leaderboard integration)
- `backend`: FastAPI API (auth, health, seasons list, leaderboard endpoint skeleton)
- `backend/sql`: PostgreSQL/Supabase schema migration

## Quick Start

### 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend default URL: http://localhost:3000
Backend default URL: http://localhost:8000

## Environment Variables

Backend:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`

Frontend:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

## Deploy (Render + Vercel)

This is the fastest production setup for this project.

### Why this setup

- Frontend: Vercel (best for Next.js)
- Backend: Render (FastAPI + OCR support)
- OCR requires the `tesseract-ocr` system package, so Docker is strongly recommended.

### Is Docker required?

- If you want OCR uploads to work: use Docker for backend deployment.
- If you do not need OCR: you can run backend without Docker, but OCR endpoints will fail without Tesseract.

### 1) Deploy backend to Render

The repo includes [render.yaml](render.yaml) and [backend/Dockerfile](backend/Dockerfile).

1. Push code to GitHub.
2. In Render: New + -> Blueprint.
3. Select this repo and create resources from blueprint.
4. In Render service env vars, set real values for:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `ADMIN_PASSWORD`
	- `JWT_SECRET`
	- `ALLOWED_ORIGINS` (set to your Vercel URL after frontend deploy)
5. Wait for deploy and copy backend URL, for example:
	- `https://dream11-api.onrender.com`

Health check URL:
- `https://dream11-api.onrender.com/health`

API base URL used by frontend:
- `https://dream11-api.onrender.com/api/v1`

### 2) Deploy frontend to Vercel

1. Import this repo in Vercel.
2. Set Root Directory to `frontend`.
3. Add env var:
	- `NEXT_PUBLIC_API_URL=https://dream11-api.onrender.com/api/v1`
4. Deploy.

### 3) Final CORS update on backend

After Vercel gives your frontend URL, update backend `ALLOWED_ORIGINS` in Render to:

- `https://your-app.vercel.app`

If you use multiple domains, comma-separate them.

### 4) Security checklist before go-live

1. Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed.
2. Change `ADMIN_PASSWORD` to a strong new value.
3. Set a long random `JWT_SECRET`.
4. Never commit real secrets to `.env` files.

## Implemented in this pass

- Next.js frontend scaffold with dark UI shell and route placeholders
- Admin login page wired to backend `/auth/login`
- FastAPI core app with CORS and router wiring
- JWT cookie auth utilities and login/logout endpoints
- Health endpoint
- Seasons list endpoint and leaderboard read endpoint
- Supabase schema migration with multiplier consistency triggers

## Next Build Slice

- Full season/player/match CRUD endpoints
- OCR-assisted + manual score entry flows
- Stats and H2H endpoints
- Admin dashboard + match create/edit flows
- Share card generation + archive workflows

