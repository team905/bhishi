# Vercel Deployment Guide - All-in-One

## Why Vercel?
- ✅ **100% Free** for your use case
- ✅ **Everything in one place**: Frontend + Backend + Database
- ✅ **Vercel Postgres** - Free tier (64MB storage, perfect to start)
- ✅ **Automatic HTTPS/SSL**
- ✅ **Global CDN** for frontend
- ✅ **Auto-deploy** from GitHub
- ✅ **Serverless functions** - scales automatically
- ✅ **Cron jobs** for scheduled tasks

## What You Get (Free Tier)
- **Frontend**: Unlimited bandwidth, global CDN
- **Backend**: Serverless functions (100GB-hours/month)
- **Database**: Vercel Postgres (64MB storage, 256MB RAM)
- **Cron Jobs**: For closing expired cycles

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
# Install PostgreSQL driver (already added)
cd backend
npm install

# Install Vercel CLI (optional, for local testing)
npm install -g vercel
```

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 3: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign up/login
2. **Click "Add New Project"**
3. **Import your GitHub repository**
4. **Configure Project**:
   - Framework Preset: **Other**
   - Root Directory: **Leave as root** (we'll handle this)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/build`

### Step 4: Add Vercel Postgres Database

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **"Create Database"** → **"Postgres"**
3. Choose **"Hobby"** plan (Free tier)
4. Name it: `bhishi-db`
5. Vercel will automatically:
   - Create the database
   - Set `POSTGRES_URL` environment variable
   - Your app will use it automatically!

### Step 5: Set Environment Variables

In Vercel project → **Settings** → **Environment Variables**, add:

```
JWT_SECRET=your-very-secure-random-string-min-32-chars
NODE_ENV=production
DATABASE_URL=$POSTGRES_URL
CRON_SECRET=another-random-secret-for-cron-jobs
```

**Generate secrets**:
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 6: Update Database Config

The code automatically detects `POSTGRES_URL` or `DATABASE_URL` and uses PostgreSQL.

### Step 7: Set Up Cron Job

1. In Vercel dashboard → **Settings** → **Cron Jobs**
2. Add cron job:
   - **Path**: `/api/cron/close-cycles`
   - **Schedule**: `*/1 * * * *` (every minute)
   - **Timezone**: Your timezone

### Step 8: Update Frontend API URL

Create `frontend/.env.production`:
```
REACT_APP_API_URL=https://your-project.vercel.app
```

Or Vercel will auto-set it. Update `frontend/src/contexts/AuthContext.js` to use:
```javascript
const API_URL = process.env.REACT_APP_API_URL || '/api';
```

### Step 9: Deploy!

Click **"Deploy"** in Vercel. It will:
1. Build your frontend
2. Set up serverless functions for backend
3. Connect to Postgres database
4. Deploy everything!

## Project Structure for Vercel

```
bhishi/
├── api/                    # Serverless functions
│   ├── index.js           # Main API handler
│   └── cron/
│       └── close-cycles.js # Cron job for closing cycles
├── backend/               # Your Express app
│   ├── server.js
│   └── ...
├── frontend/              # React app
│   ├── build/            # Built files (generated)
│   └── ...
└── vercel.json           # Vercel configuration
```

## How It Works

### Backend (Serverless Functions)
- All `/api/*` routes → Serverless functions
- Express app runs in serverless mode
- Auto-scales based on traffic
- Cold starts ~100-200ms (first request)

### Frontend
- Built React app served from CDN
- All routes proxy to `/api` for backend calls
- Super fast global delivery

### Database
- Vercel Postgres (managed PostgreSQL)
- Automatic backups
- Connection pooling included

### Cron Jobs
- Runs every minute to close expired cycles
- Secure with `CRON_SECRET` header

## Cost Breakdown

### Free Tier (Hobby)
- **Frontend**: ✅ Unlimited
- **Backend Functions**: ✅ 100GB-hours/month (plenty for small apps)
- **Database**: ✅ 64MB storage, 256MB RAM
- **Bandwidth**: ✅ 100GB/month
- **Total**: **$0/month**

### If You Need More (Pro - $20/month)
- More database storage (8GB)
- More function execution time
- Better performance
- Priority support

## Environment Variables

### Required
```
JWT_SECRET=your-secret-key
DATABASE_URL=$POSTGRES_URL  (auto-set by Vercel)
NODE_ENV=production
CRON_SECRET=your-cron-secret
```

### Optional
```
REACT_APP_API_URL=https://your-project.vercel.app
```

## Database Migration

**Automatic!** When you deploy:
1. Vercel creates Postgres database
2. Your app connects on first request
3. Tables are created automatically
4. Default admin user is created

**No manual migration needed!**

## Updating Your Code

### Option 1: Auto-Deploy (Recommended)
1. Push to GitHub
2. Vercel auto-deploys
3. Done!

### Option 2: Manual Deploy
```bash
vercel --prod
```

## Monitoring

Vercel Dashboard shows:
- ✅ Function logs
- ✅ Database usage
- ✅ Traffic analytics
- ✅ Error tracking
- ✅ Performance metrics

## Troubleshooting

### Database Connection Issues
- Check `POSTGRES_URL` is set
- Verify database is created in Vercel dashboard
- Check connection string format

### Cron Job Not Running
- Verify cron job is configured in Vercel dashboard
- Check `CRON_SECRET` matches
- View function logs

### Cold Start Too Slow
- First request after inactivity takes ~200ms
- Subsequent requests are instant
- Consider keeping functions warm (Pro plan)

## Next Steps After Deployment

1. ✅ Test your deployed app
2. ✅ Update admin password (default: admin/admin123)
3. ✅ Set up custom domain (optional, free)
4. ✅ Monitor usage in Vercel dashboard

## Custom Domain (Free)

1. In Vercel → Settings → Domains
2. Add your domain
3. Follow DNS instructions
4. Free SSL automatically!

## Backup Strategy

Vercel Postgres includes:
- ✅ Automatic daily backups
- ✅ Point-in-time recovery (Pro plan)
- ✅ Can export data anytime

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
- Status Page: https://vercel-status.com

---

## Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Vercel Postgres database created
- [ ] Environment variables set
- [ ] Cron job configured
- [ ] Frontend API URL updated
- [ ] Deployed and tested!

**Ready? Let's deploy! 🚀**

