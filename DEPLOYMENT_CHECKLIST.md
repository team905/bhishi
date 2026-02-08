# Quick Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] Code is committed to Git
- [ ] All files are saved
- [ ] `vercel.json` exists and is correct
- [ ] Root `package.json` has all backend dependencies
- [ ] `api/index.js` sets `process.env.VERCEL = '1'` at the top
- [ ] `backend/config/database.js` routes to PostgreSQL when `DATABASE_URL` is set

## 🗑️ Delete Existing Resources

- [ ] Delete Vercel project (Settings → Delete Project)
- [ ] Delete database (Neon/Supabase project)
- [ ] (Optional) Clean local `node_modules` and build files

## 🆕 Fresh Deployment Steps

### 1. Create Database
- [ ] Create new Neon or Supabase project
- [ ] Copy connection string
- [ ] Save connection string securely

### 2. Create Vercel Project
- [ ] Import from Git repository OR deploy via CLI
- [ ] Project name: `bhishi`

### 3. Configure Environment Variables
- [ ] Add `DATABASE_URL` = (your connection string)
- [ ] Add `JWT_SECRET` = (generate random string)
- [ ] (Optional) Add `NODE_ENV` = `production`

### 4. Configure Build Settings
- [ ] Framework Preset: **Other**
- [ ] Build Command: `npm install && cd backend && npm install && cd ../frontend && npm install && npm run build`
- [ ] Output Directory: `frontend/build`
- [ ] Install Command: `npm install && cd backend && npm install && cd ../frontend && npm install`

### 5. Deploy
- [ ] Trigger deployment (auto or manual)
- [ ] Wait for build to complete
- [ ] Check build logs for errors

### 6. Verify Deployment
- [ ] Test `/api/health` endpoint → Should return `{"status":"ok"}`
- [ ] Test `/api/test` endpoint → Should return `{"message":"Serverless function is working!"}`
- [ ] Check function logs → Should see PostgreSQL initialization
- [ ] Test login page → Should load
- [ ] Login with `admin` / `admin123` → Should work

### 7. Post-Deployment
- [ ] Change default admin password
- [ ] Verify database tables were created
- [ ] Test creating a user
- [ ] Test creating a group
- [ ] Test creating a bidding cycle

## 🔍 Troubleshooting

If health check fails:
1. Check environment variables are set
2. Check build logs for npm install errors
3. Check function logs for database connection errors

If database connection fails:
1. Verify `DATABASE_URL` format is correct
2. Check database is accessible
3. Ensure SSL mode is included (for Neon: `?sslmode=require`)

If routes don't work:
1. Verify `vercel.json` rewrites are correct
2. Check `/api/health` works first
3. Check function logs for route loading errors

## 📝 Important Notes

- Default admin credentials: `admin` / `admin123` (change immediately!)
- Database auto-initializes on first API call
- All backend dependencies must be in root `package.json`
- `sqlite3` should NOT be in root `package.json` (only in `backend/package.json` for local dev)

---

**Full detailed guide:** See `CLEAN_DEPLOYMENT_GUIDE.md`

