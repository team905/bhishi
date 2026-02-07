# Quick Deployment Guide

## Current Database: SQLite → PostgreSQL Migration Ready

Your app is now configured to:
- Use **SQLite** in development (local)
- Use **PostgreSQL** in production (when `DATABASE_URL` is set)

## Recommended: Railway.app Deployment

### Why Railway?
- ✅ **$5/month** - Everything included (hosting + database)
- ✅ **Automatic backups** - Daily backups included
- ✅ **Zero configuration** - Just connect GitHub and deploy
- ✅ **Auto-deploy** - Deploys on every git push
- ✅ **Free SSL/HTTPS** - Automatic

### Step 1: Prepare Your Code

1. **Install PostgreSQL driver** (already done):
```bash
cd backend
npm install
```

2. **Commit and push to GitHub**:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway will auto-detect Node.js and start building

### Step 3: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically:
   - Create the database
   - Set `DATABASE_URL` environment variable
   - Your app will use it automatically!

### Step 4: Set Environment Variables

In Railway dashboard → Variables tab, add:
```
JWT_SECRET=your-very-secure-random-string-here-min-32-chars
NODE_ENV=production
```

**Generate JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Deploy Frontend

**Option A: Railway (Same Platform)**
1. Add new service → "Static Site"
2. Root directory: `frontend`
3. Build command: `npm install && npm run build`
4. Output directory: `build`

**Option B: Vercel (Recommended - Free)**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Root directory: `frontend`
4. Build command: `npm run build`
5. Output directory: `build`
6. Add environment variable:
   - `REACT_APP_API_URL=https://your-railway-backend.railway.app`

### Step 6: Update Frontend API URL

If using Vercel, update `frontend/src/contexts/AuthContext.js` or create `.env`:
```
REACT_APP_API_URL=https://your-backend-url.railway.app
```

## Cost Breakdown

### Railway.app
- **Hobby Plan**: $5/month
  - Includes: Web hosting + PostgreSQL + Backups
  - 512MB RAM (enough for small-medium apps)
  - $5 credit/month

### Vercel (Frontend)
- **Free Tier**: $0/month
  - Unlimited bandwidth
  - Global CDN
  - Perfect for React apps

**Total Monthly Cost: $5-10**

## Alternative: Render.com (Free Tier Available)

If you want to start free:

1. Go to [render.com](https://render.com)
2. Create "Web Service" for backend
3. Create "PostgreSQL" database (free tier available)
4. Create "Static Site" for frontend
5. Set environment variables

**Note**: Free tier spins down after inactivity (~30s wake time)

## Database Migration

Your code automatically:
- Uses SQLite when `DATABASE_URL` is not set (local dev)
- Uses PostgreSQL when `DATABASE_URL` is set (production)

**No manual migration needed!** The tables will be created automatically on first run.

## Backups

### Railway
- **Automatic daily backups**
- 7-day retention included
- Can download backups anytime

### Manual Backup (Optional)
```bash
# Connect to Railway PostgreSQL and dump
pg_dump $DATABASE_URL > backup.sql
```

## Monitoring

Railway provides:
- Built-in logs
- Metrics dashboard
- Error tracking

## Next Steps After Deployment

1. ✅ Test your deployed app
2. ✅ Update admin password (default: admin/admin123)
3. ✅ Set up custom domain (optional)
4. ✅ Configure email notifications (if needed)

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` is set correctly
- Verify PostgreSQL service is running in Railway

### Build Failures
- Check Railway logs
- Ensure all dependencies are in `package.json`

### Frontend Can't Connect to Backend
- Verify `REACT_APP_API_URL` is set correctly
- Check CORS settings in backend

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

---

**Ready to deploy?** Just push to GitHub and connect to Railway! 🚀

