# 🚀 Deployment Guide - Making Changes to Production

This guide shows you how to deploy changes to production after making code modifications.

---

## 📋 Before You Deploy

### 1. Test Locally First
```bash
# Always test your changes locally before deploying
# Follow QUICK_START.md to run locally
```

### 2. Commit Your Changes
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Description of your changes"

# Push to repository
git push origin main
```

---

## 🔄 Option 1: Automatic Deployment (CI/CD)

**If CI/CD is set up correctly, changes are deployed automatically when you push to `firebase` branch.**

### How It Works

1. **Push to `firebase` branch:**
   ```bash
   git push origin firebase
   ```

2. **GitHub Actions automatically:**
   - Builds backend Docker image
   - Deploys backend to Cloud Run
   - Builds frontend
   - Deploys frontend to Firebase Hosting
   - Deploys Firestore indexes (if changed)

3. **Check deployment status:**
   - Go to [GitHub Actions](https://github.com/your-username/bhishi/actions)
   - Click on the latest workflow run
   - Wait for all jobs to complete (usually 5-10 minutes)

### Verify Deployment

```bash
# Check backend health
curl https://bhishi-backend-867590875581.us-central1.run.app/api/health

# Check frontend
open https://bhishi-management.web.app
```

---

## 🔧 Option 2: Manual Deployment

Use this if CI/CD is not set up or you need to deploy immediately.

### Deploy Backend Changes

```bash
# Navigate to backend directory
cd backend

# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/bhishi-management/bhishi-backend .

# Deploy (environment variables are already set)
gcloud run deploy bhishi-backend \
  --image gcr.io/bhishi-management/bhishi-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

**Note:** Environment variables are preserved from previous deployment. If you need to update them, see "Update Environment Variables" section below.

---

### Deploy Frontend Changes

```bash
# Navigate to project root
cd /Users/shubham905/Documents/bhishi

# Make sure you're using production project
firebase use production

# Build frontend
cd frontend
npm run build

# Deploy to Firebase Hosting
cd ..
firebase deploy --only hosting
```

---

### Deploy Firestore Indexes (If Changed)

```bash
# Navigate to project root
cd /Users/shubham905/Documents/bhishi

# Make sure you're using production project
firebase use production

# Deploy indexes
firebase deploy --only firestore:indexes
```

**Note:** Indexes take 2-5 minutes to build. Check status in [Firebase Console](https://console.firebase.google.com/project/bhishi-management/firestore/indexes).

---

### Deploy Firestore Rules (If Changed)

```bash
# Navigate to project root
cd /Users/shubham905/Documents/bhishi

# Make sure you're using production project
firebase use production

# Deploy rules
firebase deploy --only firestore:rules
```

---

## 🔐 Update Environment Variables

If you need to update backend environment variables:

### Method 1: Using env-vars-file (Recommended)

```bash
# From project root
cd /Users/shubham905/Documents/bhishi

# Get service account key as single-line string
export FIREBASE_SA_KEY=$(node -e "console.log(JSON.stringify(require('./service-account-key.json')))")

# Generate or use existing JWT secret
export JWT_SECRET=$(openssl rand -base64 32)

# Create env vars file
cat > /tmp/cloud-run-env-vars.yaml << EOF
FIREBASE_SERVICE_ACCOUNT_KEY: '$FIREBASE_SA_KEY'
NODE_ENV: 'production'
FIREBASE_USE_EMULATOR: 'false'
FIREBASE_PROJECT_ID: 'bhishi-management'
JWT_SECRET: '$JWT_SECRET'
EOF

# Update Cloud Run service
gcloud run services update bhishi-backend \
  --env-vars-file=/tmp/cloud-run-env-vars.yaml \
  --region us-central1

# Clean up
rm /tmp/cloud-run-env-vars.yaml
```

### Method 2: Using Google Cloud Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on `bhishi-backend` service
3. Click **"Edit & Deploy New Revision"**
4. Go to **"Variables & Secrets"** tab
5. Add/update environment variables
6. Click **"Deploy"**

---

## 📊 Deployment Checklist

Before deploying, make sure:

- [ ] Code is tested locally
- [ ] Changes are committed and pushed
- [ ] Environment variables are set correctly
- [ ] Firestore indexes are updated (if queries changed)
- [ ] Firestore rules are updated (if security changed)
- [ ] Frontend `.env.production` has correct `REACT_APP_API_URL`

---

## 🐛 Troubleshooting Deployment

### Backend Deployment Fails

```bash
# Check build logs
gcloud builds list --limit 5

# Check Cloud Run logs
gcloud run services logs read bhishi-backend --region us-central1 --limit 50

# Verify environment variables
gcloud run services describe bhishi-backend --region us-central1 --format="value(spec.template.spec.containers[0].env)"
```

### Frontend Deployment Fails

```bash
# Check Firebase deployment logs
firebase deploy --only hosting --debug

# Verify build works locally
cd frontend
npm run build
```

### Indexes Not Building

1. Go to [Firebase Console - Indexes](https://console.firebase.google.com/project/bhishi-management/firestore/indexes)
2. Check if indexes show "Building" status
3. Wait 2-5 minutes for indexes to build
4. If stuck, check error messages in Firebase Console

---

## 🔄 Rollback Deployment

### Rollback Backend

```bash
# List revisions
gcloud run revisions list --service bhishi-backend --region us-central1

# Rollback to previous revision
gcloud run services update-traffic bhishi-backend \
  --to-revisions PREVIOUS_REVISION_NAME=100 \
  --region us-central1
```

### Rollback Frontend

```bash
# List hosting releases
firebase hosting:channel:list

# Rollback (if using Firebase Hosting)
# Go to Firebase Console → Hosting → Releases
# Click on previous release → "Rollback"
```

---

## 📝 Common Deployment Scenarios

### Scenario 1: Backend Code Change Only

```bash
cd backend
gcloud builds submit --tag gcr.io/bhishi-management/bhishi-backend .
gcloud run deploy bhishi-backend --image gcr.io/bhishi-management/bhishi-backend --region us-central1
```

### Scenario 2: Frontend Code Change Only

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### Scenario 3: Database Schema Change (New Collections/Fields)

1. Update Firestore indexes if needed:
   ```bash
   firebase deploy --only firestore:indexes
   ```

2. Update Firestore rules if needed:
   ```bash
   firebase deploy --only firestore:rules
   ```

3. Redeploy backend:
   ```bash
   cd backend
   gcloud builds submit --tag gcr.io/bhishi-management/bhishi-backend .
   gcloud run deploy bhishi-backend --image gcr.io/bhishi-management/bhishi-backend --region us-central1
   ```

### Scenario 4: Environment Variable Change

Follow "Update Environment Variables" section above.

---

## 🎯 Quick Deploy Commands

```bash
# Full deployment (backend + frontend + indexes)
cd backend && gcloud builds submit --tag gcr.io/bhishi-management/bhishi-backend . && \
gcloud run deploy bhishi-backend --image gcr.io/bhishi-management/bhishi-backend --region us-central1 && \
cd ../frontend && npm run build && cd .. && \
firebase deploy --only hosting,firestore:indexes
```

---

**Remember:** Always test locally first! 🧪

