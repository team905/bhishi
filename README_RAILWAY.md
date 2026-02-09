# Railway Deployment - Quick Start

## 🚀 Quick Deployment Steps

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"

3. **Add PostgreSQL Database**
   - Click "+ New" → "Database" → "Add PostgreSQL"
   - Railway automatically sets `DATABASE_URL`

4. **Add Backend Service**
   - Click "+ New" → "GitHub Repo" → Select your repo
   - **Settings:**
     - Root Directory: Leave empty
     - Build Command: `npm install`
     - Start Command: `cd backend && npm start`
   - **Variables:**
     - Reference `DATABASE_URL` from PostgreSQL service
     - Add `JWT_SECRET` (generate: `openssl rand -base64 32`)
     - Add `NODE_ENV` = `production`

5. **Add Frontend Service**
   - Click "+ New" → "GitHub Repo" → Select same repo
   - **Settings:**
     - Root Directory: `frontend`
     - Build Command: `npm install && npm run build`
     - Start Command: `npx serve -s build -l 3000`
   - **Variables:**
     - Add `REACT_APP_API_URL` = Your backend URL (from step 4)

6. **Deploy & Test**
   - Railway auto-deploys on push to GitHub
   - Get URLs from each service's Settings → Generate Domain
   - Test login: `admin` / `admin123`

## 📚 Full Guide

See [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🔄 Local vs Production

- **Local:** No `DATABASE_URL` → Uses SQLite (`backend/data/bhishi.db`)
- **Production:** `DATABASE_URL` set → Uses PostgreSQL (Railway)

No code changes needed - automatic switching!

