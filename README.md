# Breach — Phishing Simulation Platform

Welcome to **Breach**, a comprehensive security awareness and phishing simulation platform. It covers phishing campaign management, real-time event tracking, credential harvest simulation, and risk analytics across multiple channels (Email, SMS, and WhatsApp).

## Repository Structure

This is a monorepo consisting of:
- **`/backend`**: A production-quality FastAPI application handling API requests, background jobs, database interactions, and live WebSockets.
- **`/frontend`**: A Vite + React application providing the interactive user interface, administrator dashboards, and analytics charts.

---

## 🚀 Quick Start (Local Development)

### 1. Database Setup (Supabase)
The application expects a PostgreSQL database. Set up your Supabase project and get your **IPv4 Connection Pooler URL**.

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/scripts/activate  # On Windows
pip install -r requirements.txt
```

Create `.env` in the `backend/` directory:
```env
DATABASE_URL=postgresql+asyncpg://[user]:[password]@[pooler-domain]:6543/postgres
SIM_BASE_URL=http://localhost:8000
```
Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
Open a new terminal:
```bash
cd frontend
npm install
```
Start the frontend dev server:
```bash
npm run dev
```
*(The frontend automatically proxies `/api` calls to `localhost:8000` during local development).*

---

## 🌍 Production Deployment

### Backend (Render / Railway)
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment**: Add `DATABASE_URL` and any other secrets from your `.env` file.

### Frontend (Vercel / Netlify)
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Environment Variable**: You **must** set `VITE_API_URL` to your deployed backend URL (e.g., `https://breach-backend.onrender.com`).

---

## Architecture Overview

- **Database**: PostgreSQL 15 (hosted on Supabase) accessed asynchronously via `asyncpg` and SQLAlchemy.
- **Backend**: FastAPI providing REST endpoints and WebSocket connections (`/ws/events`) for live campaign tracking.
- **Frontend**: React (TypeScript) configured with Vite, using Shadcn-UI and Tailwind for styling.
- **Reporting**: Advanced analytics computing user risk scores based on clicks, credential attempts, downloads, and user self-reports.
- **Security**: JWT authentication, bcrypt password hashing, and zero-storage credential harvesting (simulated attacks only log the *attempt*, not the input data).
