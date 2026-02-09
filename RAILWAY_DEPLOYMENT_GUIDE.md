# Complete Railway Deployment Guide - Bhishi Management System

This guide will help you deploy your full-stack application (Frontend, Backend, and Database) on Railway.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Railway Setup](#railway-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Environment Variables](#environment-variables)
7. [Automated Deployment](#automated-deployment)
8. [Local vs Production Database](#local-vs-production-database)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub account (for automated deployments)
- Node.js installed locally (for testing)

---

## Railway Setup

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended for automated deployments)

### Step 2: Create New Project

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"** (if your code is on GitHub)
   - OR select **"Empty Project"** if deploying manually

---

## Database Setup

### Step 1: Add PostgreSQL Service

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. Wait for the database to be provisioned (~30 seconds)

### Step 2: Get Database Connection String

1. Click on the **PostgreSQL** service
2. Go to **"Variables"** tab
3. Find **`DATABASE_URL`** - this is automatically set by Railway
4. Copy this value (you'll need it for backend configuration)

**Note:** Railway automatically sets `DATABASE_URL` as an environment variable, so you don't need to manually configure it!

---

## Backend Deployment

### Step 1: Add Backend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** (if using GitHub)
   - OR **"Empty Service"** for manual deployment
3. Select your repository
4. Railway will detect it's a Node.js project

### Step 2: Configure Backend Service

1. Click on your **backend service**
2. Go to **"Settings"** tab
3. Configure:

   **Root Directory:** Leave empty (or set to `backend` if you want to deploy only backend)
   
   **Build Command:** 
   ```
   npm install
   ```
   
   **Start Command:**
   ```
   cd backend && npm start
   ```
   
   **OR if Root Directory is set to `backend`:**
   - Build Command: `npm install`
   - Start Command: `npm start`

### Step 3: Connect Database to Backend

1. In your **backend service**, go to **"Variables"** tab
2. Click **"Reference Variable"**
3. Select your **PostgreSQL** service
4. Select **`DATABASE_URL`**
5. Railway will automatically link it

**Note:** The backend will automatically use PostgreSQL when `DATABASE_URL` is set, and SQLite when it's not (local development).

### Step 4: Add Other Environment Variables

In **"Variables"** tab, add:

- **`PORT`**: `5005` (or leave Railway to auto-assign)
- **`JWT_SECRET`**: Generate a random string (e.g., `openssl rand -base64 32`)
- **`NODE_ENV`**: `production`

### Step 5: Deploy Backend

1. Railway will auto-deploy when you push to GitHub (if connected)
2. OR click **"Deploy"** button for manual deployment
3. Wait for deployment to complete
4. Check **"Logs"** tab for deployment status

### Step 6: Get Backend URL

1. In backend service, go to **"Settings"** tab
2. Find **"Generate Domain"** button
3. Click to generate a public URL (e.g., `your-backend.railway.app`)
4. Copy this URL - you'll need it for frontend configuration

---

## Frontend Deployment

### Step 1: Add Frontend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** (same repository)
3. Railway will create a new service

### Step 2: Configure Frontend Service

1. Click on your **frontend service**
2. Go to **"Settings"** tab
3. Configure:

   **Root Directory:** `frontend`
   
   **Build Command:**
   ```
   npm install && npm run build
   ```
   
   **Start Command:**
   ```
   npx serve -s build -l 3000
   ```
   
   **OR use a static file server:**
   - Install `serve` in frontend: `npm install -g serve` (or add to package.json)
   - Start Command: `serve -s build -l 3000`

### Step 3: Update Frontend API Configuration

1. In frontend service, go to **"Variables"** tab
2. Add environment variable:

   **`REACT_APP_API_URL`**: `https://your-backend.railway.app`
   
   (Replace `your-backend.railway.app` with your actual backend URL)

### Step 4: Update Frontend Code (if needed)

Make sure `frontend/src/config/api.js` uses the environment variable:

```javascript
const getApiUrl = () => {
  // Use environment variable if set (production)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Default to localhost for development
  return 'http://localhost:5005';
};

export default getApiUrl;
```

### Step 5: Deploy Frontend

1. Railway will auto-deploy when you push to GitHub
2. OR click **"Deploy"** button
3. Wait for deployment to complete

### Step 6: Get Frontend URL

1. In frontend service, go to **"Settings"** tab
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `your-frontend.railway.app`)

---

## Environment Variables Summary

### Backend Service Variables:
- `DATABASE_URL` - Automatically set by Railway (from PostgreSQL service)
- `PORT` - `5005` (or auto-assigned by Railway)
- `JWT_SECRET` - Random string (generate: `openssl rand -base64 32`)
- `NODE_ENV` - `production`

### Frontend Service Variables:
- `REACT_APP_API_URL` - Your backend URL (e.g., `https://your-backend.railway.app`)

### PostgreSQL Service:
- `DATABASE_URL` - Automatically set (no action needed)

---

## Automated Deployment

### Option 1: GitHub Integration (Recommended)

1. **Connect GitHub:**
   - In Railway project, click **"Settings"** → **"Connect GitHub"**
   - Authorize Railway to access your repositories
   - Select your repository

2. **Auto-Deploy:**
   - Railway will automatically deploy on every push to `main` branch
   - You can configure branch in service settings

3. **Manual Deploy:**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** to manually trigger deployment

### Option 2: Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Link Project:**
   ```bash
   railway link
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

---

## Local vs Production Database

### How It Works

The application automatically switches between databases:

- **Local Development (No DATABASE_URL):**
  - Uses SQLite (`backend/data/bhishi.db`)
  - No configuration needed
  - Perfect for local testing

- **Production (DATABASE_URL set):**
  - Uses PostgreSQL (Railway database)
  - Automatically configured by Railway
  - No code changes needed

### Switching Between Databases

**To use local SQLite:**
```bash
# Make sure DATABASE_URL is NOT set
unset DATABASE_URL  # Linux/Mac
# OR remove from .env file
```

**To use production PostgreSQL:**
```bash
# DATABASE_URL is automatically set by Railway
# No action needed when deployed
```

### Testing Locally with Production Database

If you want to test locally with Railway's PostgreSQL:

1. Get `DATABASE_URL` from Railway PostgreSQL service
2. Create `.env` file in project root:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```
3. Run backend:
   ```bash
   cd backend && npm start
   ```

**Note:** Be careful! This will use your production database locally.

---

## Project Structure on Railway

```
Railway Project: bhishi-management-system
├── PostgreSQL Service (Database)
│   └── Automatically provides DATABASE_URL
│
├── Backend Service
│   ├── Root: . (or backend/)
│   ├── Build: npm install
│   ├── Start: cd backend && npm start
│   └── Variables:
│       ├── DATABASE_URL (from PostgreSQL)
│       ├── PORT
│       ├── JWT_SECRET
│       └── NODE_ENV
│
└── Frontend Service
    ├── Root: frontend
    ├── Build: npm install && npm run build
    ├── Start: npx serve -s build -l 3000
    └── Variables:
        └── REACT_APP_API_URL
```

---

## Troubleshooting

### Backend Won't Start

1. **Check Logs:**
   - Go to backend service → **"Logs"** tab
   - Look for error messages

2. **Common Issues:**
   - **Database connection failed:** Check `DATABASE_URL` is set correctly
   - **Port already in use:** Remove `PORT` variable, let Railway assign
   - **Module not found:** Check `package.json` has all dependencies

3. **Verify Database Connection:**
   - Check PostgreSQL service is running
   - Verify `DATABASE_URL` is referenced in backend variables

### Frontend Can't Connect to Backend

1. **Check `REACT_APP_API_URL`:**
   - Should be your backend Railway URL
   - Must start with `https://`
   - No trailing slash

2. **Check CORS:**
   - Backend should allow requests from frontend domain
   - Verify `cors` middleware is enabled in `backend/server.js`

3. **Check Network:**
   - Both services must be deployed and running
   - Check backend logs for incoming requests

### Database Issues

1. **Tables Not Created:**
   - Backend automatically creates tables on first start
   - Check backend logs for "Database initialized successfully"
   - If tables exist, you'll see "PostgreSQL tables created/verified"

2. **Connection Errors:**
   - Verify PostgreSQL service is running
   - Check `DATABASE_URL` format is correct
   - Ensure SSL is enabled (Railway handles this automatically)

### Build Failures

1. **Frontend Build Fails:**
   - Check Node.js version (Railway auto-detects)
   - Verify all dependencies in `frontend/package.json`
   - Check build logs for specific errors

2. **Backend Build Fails:**
   - Verify `backend/package.json` has all dependencies
   - Check for missing native modules (like `sqlite3` - should be optional)

---

## Quick Start Checklist

- [ ] Create Railway account
- [ ] Create new project
- [ ] Add PostgreSQL database service
- [ ] Add backend service (connect to GitHub)
- [ ] Configure backend (build/start commands)
- [ ] Link DATABASE_URL from PostgreSQL to backend
- [ ] Add backend environment variables (JWT_SECRET, NODE_ENV)
- [ ] Deploy backend and get URL
- [ ] Add frontend service
- [ ] Configure frontend (root: frontend, build/start commands)
- [ ] Set REACT_APP_API_URL to backend URL
- [ ] Deploy frontend and get URL
- [ ] Test login: `admin` / `admin123`
- [ ] Change default admin password

---

## Cost Estimation

Railway offers:
- **Free Tier:** $5 credit/month
- **Pro Plan:** $20/month (includes more resources)

For this project:
- PostgreSQL: ~$5-10/month (depending on usage)
- Backend service: ~$5-10/month
- Frontend service: ~$5/month

**Total:** ~$15-25/month on Pro plan, or use free credits

---

## Next Steps

1. **Set up custom domains** (optional):
   - Go to service → Settings → Domains
   - Add your custom domain

2. **Enable monitoring:**
   - Railway provides built-in metrics
   - Check service health in dashboard

3. **Set up backups:**
   - PostgreSQL service has automatic backups
   - Configure backup retention in PostgreSQL settings

4. **Scale services:**
   - Increase resources if needed
   - Add more instances for high traffic

---

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check service logs for detailed error messages

---

**Congratulations!** Your Bhishi Management System is now deployed on Railway! 🚀

