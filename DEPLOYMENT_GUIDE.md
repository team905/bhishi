# Bhishi Management System - Deployment Guide

## Current Setup
- **Database**: SQLite (file-based)
- **Backend**: Node.js/Express
- **Frontend**: React

## Recommended Deployment Strategy

### Option 1: Railway.app (RECOMMENDED - Easiest & Most Cost-Effective)
**Cost**: ~$5-10/month (includes database + hosting)
**Best for**: Quick deployment, minimal configuration

**Pros**:
- ✅ One-click deployment from GitHub
- ✅ PostgreSQL database included
- ✅ Automatic HTTPS/SSL
- ✅ Built-in backups
- ✅ Free tier available (limited)
- ✅ Auto-deploy on git push
- ✅ Environment variables management
- ✅ Simple pricing

**Setup Steps**:
1. Push code to GitHub
2. Sign up at [railway.app](https://railway.app)
3. Create new project → Deploy from GitHub
4. Add PostgreSQL service
5. Set environment variables
6. Deploy!

**Monthly Cost**: $5-10 (includes everything)

---

### Option 2: Render.com (Great Free Tier)
**Cost**: $0-7/month (free tier available)
**Best for**: Budget-conscious, good free tier

**Pros**:
- ✅ Free tier for both web service and PostgreSQL
- ✅ Automatic SSL
- ✅ Auto-deploy from GitHub
- ✅ Built-in backups
- ✅ Easy setup

**Cons**:
- ⚠️ Free tier spins down after inactivity (takes ~30s to wake)
- ⚠️ Limited resources on free tier

**Setup Steps**:
1. Push code to GitHub
2. Sign up at [render.com](https://render.com)
3. Create Web Service (backend)
4. Create PostgreSQL database
5. Create Static Site (frontend)
6. Set environment variables

**Monthly Cost**: $0 (free tier) or $7 (paid tier)

---

### Option 3: Vercel (Frontend) + Railway/Render (Backend)
**Cost**: $0-10/month
**Best for**: Best performance, separation of concerns

**Pros**:
- ✅ Vercel free tier is excellent for React apps
- ✅ Global CDN, super fast
- ✅ Backend on Railway/Render
- ✅ Best of both worlds

**Setup**:
- Frontend → Vercel (free)
- Backend → Railway ($5/month)
- Database → Included with Railway

**Monthly Cost**: $5-10

---

## Database Migration: SQLite → PostgreSQL

### Why PostgreSQL?
- ✅ Concurrent connections (SQLite is single-writer)
- ✅ Better for production workloads
- ✅ Automatic backups
- ✅ Scalability
- ✅ ACID compliance

### Migration Steps

1. **Install PostgreSQL driver**:
```bash
cd backend
npm install pg
```

2. **Update database.js** to support both SQLite (dev) and PostgreSQL (prod)

3. **Use environment variable** to switch:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
# or
DB_TYPE=sqlite (for local development)
```

---

## Recommended Setup: Railway.app

### Step-by-Step Deployment

#### 1. Prepare Your Code

Create `.env.example`:
```env
PORT=5005
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=production
DATABASE_URL=postgresql://...
```

#### 2. Update Backend for PostgreSQL

We'll need to modify `backend/config/database.js` to support PostgreSQL.

#### 3. Deploy to Railway

1. **Push to GitHub** (if not already)
2. **Go to Railway.app** → New Project → Deploy from GitHub
3. **Add PostgreSQL** service
4. **Set Environment Variables**:
   - `JWT_SECRET` (generate a strong random string)
   - `NODE_ENV=production`
   - `DATABASE_URL` (auto-set by Railway)
   - `PORT` (auto-set by Railway)

5. **Deploy!** Railway will:
   - Detect Node.js
   - Install dependencies
   - Run `npm start`
   - Expose your API

#### 4. Deploy Frontend

**Option A: Railway (Same Platform)**
- Add another service → Static site
- Point to `frontend/build` folder
- Set build command: `cd frontend && npm install && npm run build`

**Option B: Vercel (Recommended for Frontend)**
- Connect GitHub repo
- Set root directory: `frontend`
- Build command: `npm run build`
- Output directory: `build`
- Add environment variable: `REACT_APP_API_URL=https://your-railway-backend.railway.app`

---

## Cost Breakdown

### Railway.app (All-in-One)
- **Hobby Plan**: $5/month
  - 512MB RAM
  - $5 credit/month
  - PostgreSQL included
  - Automatic backups
  - Perfect for small-medium apps

- **Pro Plan**: $20/month (if you scale)
  - More resources
  - Better performance

### Render.com
- **Free Tier**: $0/month
  - 512MB RAM
  - PostgreSQL free tier
  - Spins down after inactivity
  
- **Starter Plan**: $7/month
  - Always on
  - Better performance

### Vercel (Frontend Only)
- **Free Tier**: $0/month
  - Unlimited bandwidth
  - Global CDN
  - Perfect for React apps

---

## Backup Strategy

### Automatic Backups (Included)
- **Railway**: Daily backups included, 7-day retention
- **Render**: Daily backups on paid plans
- **Supabase/Neon**: Automatic backups included

### Manual Backup Script
Create `scripts/backup-db.js`:
```javascript
// PostgreSQL backup using pg_dump
// Can be run via cron job
```

---

## Environment Variables Checklist

### Backend (.env)
```env
PORT=5005
JWT_SECRET=your-very-secure-secret-key-here
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-url.railway.app
```

---

## Next Steps

1. **Choose your platform** (I recommend Railway.app)
2. **Migrate database** from SQLite to PostgreSQL
3. **Update database.js** to support PostgreSQL
4. **Deploy backend** to Railway
5. **Deploy frontend** to Vercel or Railway
6. **Set up environment variables**
7. **Test deployment**
8. **Set up custom domain** (optional)

---

## Automation (Future)

### GitHub Actions CI/CD
- Auto-deploy on push to main branch
- Run tests before deployment
- Automated database migrations

### Monitoring
- Railway has built-in monitoring
- Add Sentry for error tracking (free tier available)

---

## Support & Resources

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- PostgreSQL Migration: We'll create migration scripts

---

## Recommendation Summary

**Best Option**: Railway.app
- **Cost**: $5/month (everything included)
- **Ease**: ⭐⭐⭐⭐⭐ (easiest)
- **Backups**: ✅ Automatic
- **Scaling**: Easy to upgrade
- **Support**: Good documentation

**Alternative**: Render.com (if you want free tier)
- **Cost**: $0-7/month
- **Ease**: ⭐⭐⭐⭐
- **Backups**: ✅ (on paid tier)
- **Note**: Free tier spins down

Would you like me to:
1. Create the PostgreSQL migration code?
2. Set up Railway deployment configuration?
3. Create deployment scripts?

