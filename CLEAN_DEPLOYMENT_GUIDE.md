# Complete Clean Deployment Guide - Bhishi Management System

This guide will help you delete everything and deploy from scratch on Vercel.

## Part 1: Delete Existing Resources

### Step 1: Delete Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project: **Shubham's projects > bhishi**
3. Click on **Settings** (in the top navigation)
4. Scroll down to the bottom
5. Find the **"Delete Project"** section
6. Click **"Delete Project"**
7. Type the project name to confirm: `bhishi`
8. Click **"Delete"**
9. Wait for confirmation that the project is deleted

### Step 2: Delete Database (Neon or Supabase)

#### If using Neon:
1. Go to [Neon Console](https://console.neon.tech/)
2. Find your project
3. Click on the project
4. Go to **Settings** → **Delete Project**
5. Confirm deletion
6. Wait for confirmation

#### If using Supabase:
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **General**
4. Scroll to the bottom
5. Click **"Delete Project"**
6. Type the project name to confirm
7. Click **"Delete Project"**
8. Wait for confirmation

### Step 3: Clean Local Files (Optional)

If you want to start completely fresh locally:

```bash
# Navigate to project directory
cd /Users/shubham905/Documents/bhishi

# Remove node_modules (optional - will be reinstalled)
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# Remove package-lock files (optional)
rm -f package-lock.json
rm -f backend/package-lock.json
rm -f frontend/package-lock.json

# Remove local SQLite database (optional)
rm -f backend/data/bhishi.db

# Remove build files (optional)
rm -rf frontend/build
rm -rf .vercel
```

**Note:** You don't need to delete your source code files. Just the generated files.

---

## Part 2: Fresh Deployment on Vercel

### Step 1: Verify Your Code is Ready

1. Make sure all your code is committed to Git:
   ```bash
   cd /Users/shubham905/Documents/bhishi
   git status
   git add .
   git commit -m "Prepare for fresh deployment"
   git push
   ```

### Step 2: Create New Database

#### Option A: Using Neon (Recommended)

1. Go to [Neon Console](https://console.neon.tech/)
2. Click **"Create Project"**
3. Fill in:
   - **Project Name:** `bhishi-production` (or any name)
   - **Region:** Choose closest to your users (e.g., `US East (Ohio)`)
   - **PostgreSQL Version:** `15` or `16` (latest)
4. Click **"Create Project"**
5. Wait for project creation (takes ~30 seconds)
6. Once created, you'll see a connection string like:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
7. **Copy this connection string** - you'll need it in Step 4

#### Option B: Using Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `bhishi-production`
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest region
4. Click **"Create new project"**
5. Wait for project creation (takes ~2 minutes)
6. Once ready, go to **Settings** → **Database**
7. Find **"Connection string"** → **"URI"**
8. Copy the connection string (it will look like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
9. Replace `[YOUR-PASSWORD]` with the password you created
10. **Copy the final connection string**

### Step 3: Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. If your code is on GitHub/GitLab/Bitbucket:
   - Select your repository
   - Click **"Import"**
4. If your code is not in a Git repository:
   - Click **"Deploy from local"** (or use Vercel CLI - see below)

#### Using Vercel CLI (Alternative):

```bash
# Install Vercel CLI globally (if not installed)
npm install -g vercel

# Navigate to project
cd /Users/shubham905/Documents/bhishi

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? bhishi
# - Directory? ./
# - Override settings? No
```

### Step 4: Configure Vercel Project Settings

1. In Vercel Dashboard, go to your new project
2. Click **"Settings"** (top navigation)
3. Go to **"Environment Variables"** (left sidebar)
4. Click **"Add New"**
5. Add the following variables:

   **Variable 1:**
   - **Name:** `DATABASE_URL`
   - **Value:** Paste your database connection string from Step 2
   - **Environment:** Select all (Production, Preview, Development)
   - Click **"Save"**

   **Variable 2 (Optional but recommended):**
   - **Name:** `JWT_SECRET`
   - **Value:** Generate a random string (e.g., use: `openssl rand -base64 32`)
   - **Environment:** Select all
   - Click **"Save"**

   **Variable 3 (Optional):**
   - **Name:** `NODE_ENV`
   - **Value:** `production`
   - **Environment:** Production only
   - Click **"Save"**

### Step 5: Configure Build Settings

1. Still in **Settings**, go to **"General"**
2. Scroll to **"Build & Development Settings"**
3. Verify:
   - **Framework Preset:** Other
   - **Build Command:** `npm install && cd backend && npm install && cd ../frontend && npm install && npm run build`
   - **Output Directory:** `frontend/build`
   - **Install Command:** `npm install && cd backend && npm install && cd ../frontend && npm install`
4. If any are different, update them and click **"Save"**

### Step 6: Verify vercel.json

Make sure your `vercel.json` file exists and has this content:

```json
{
  "buildCommand": "npm install && cd backend && npm install && cd ../frontend && npm install && npm run build",
  "outputDirectory": "frontend/build",
  "installCommand": "npm install && cd backend && npm install && cd ../frontend && npm install",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 7: Deploy

1. Go to **"Deployments"** tab
2. If you just created the project, it should auto-deploy
3. If not, click **"Redeploy"** → **"Redeploy"** (use latest commit)
4. Wait for deployment to complete (2-5 minutes)
5. Watch the build logs for any errors

### Step 8: Verify Deployment

1. Once deployment is complete, click on the deployment
2. Click **"Visit"** to open your app
3. Test the health endpoint:
   - Go to: `https://your-app.vercel.app/api/health`
   - Should return: `{"status":"ok","message":"Bhishi Management System API"}`
4. If health check works, test login:
   - Go to: `https://your-app.vercel.app/login`
   - Use default credentials:
     - **Username:** `admin`
     - **Password:** `admin123`

### Step 9: Check Logs (if issues)

1. In Vercel Dashboard, go to **"Deployments"**
2. Click on the latest deployment
3. Click **"Functions"** tab
4. Click on `/api/index.js`
5. Check the logs for:
   - `[Vercel] Function starting...`
   - `[Vercel] DATABASE_URL: SET`
   - `[database.js] DATABASE_URL detected, routing to PostgreSQL`
   - `Connected to PostgreSQL database`

---

## Part 3: Troubleshooting

### If Health Check Fails (500 Error):

1. **Check Environment Variables:**
   - Go to Settings → Environment Variables
   - Verify `DATABASE_URL` is set correctly
   - Make sure it's available for all environments

2. **Check Build Logs:**
   - Go to Deployments → Latest → Build Logs
   - Look for errors during `npm install`

3. **Check Function Logs:**
   - Go to Deployments → Latest → Functions → `/api/index.js`
   - Look for error messages

### If Database Connection Fails:

1. **Verify Connection String:**
   - Make sure `DATABASE_URL` includes `?sslmode=require` (for Neon)
   - For Supabase, make sure password is URL-encoded if it has special characters

2. **Test Database Connection:**
   - Try connecting to your database using a PostgreSQL client
   - Verify the database is accessible

### If Routes Don't Work:

1. **Check vercel.json:**
   - Make sure rewrites are correct
   - `/api/*` should route to `/api/index.js`

2. **Check API Routes:**
   - Test: `/api/health` (should work)
   - Test: `/api/auth/login` (should work after database init)

---

## Part 4: Post-Deployment

### Step 1: Change Default Admin Password

1. Login with default credentials (`admin` / `admin123`)
2. Go to Admin Dashboard
3. Go to Users Management
4. Edit the admin user
5. Change the password to something secure

### Step 2: Verify Database Tables

The database should auto-initialize on first API call. To verify:

1. Check Vercel function logs for:
   - `PostgreSQL tables created/verified`
   - `Default admin user created`

### Step 3: Test All Features

1. **Admin Features:**
   - Create a user
   - Create a bhishi group
   - Create a bidding cycle

2. **User Features:**
   - Login as a user
   - View dashboard
   - Place a bid

---

## Quick Reference: File Structure

```
bhishi/
├── api/
│   └── index.js              # Vercel serverless function
├── backend/
│   ├── config/
│   │   ├── database.js        # Database router (routes to PostgreSQL)
│   │   ├── database-postgres.js  # PostgreSQL implementation
│   │   └── database-sqlite.js    # SQLite (local dev only)
│   ├── routes/                # API routes
│   ├── middleware/            # Express middleware
│   └── services/              # Business logic
├── frontend/
│   ├── src/                   # React source code
│   └── build/                 # Build output (generated)
├── vercel.json                # Vercel configuration
└── package.json               # Root dependencies
```

---

## Important Notes

1. **Never commit `.env` files** - use Vercel Environment Variables
2. **Never commit `node_modules`** - they're installed during build
3. **`sqlite3` is NOT in root package.json** - only PostgreSQL dependencies
4. **Database auto-initializes** on first API call
5. **Default admin:** `admin` / `admin123` (change after first login)

---

## Support

If you encounter issues:
1. Check Vercel function logs first
2. Verify environment variables are set
3. Check database connection string format
4. Ensure all dependencies are in root `package.json`

Good luck with your deployment! 🚀

