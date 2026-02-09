# 🔧 CI/CD Setup Guide

This guide explains how to set up GitHub Actions for automatic deployment.

---

## 📋 Prerequisites

- GitHub repository with your code
- Google Cloud Project with billing enabled
- Firebase Project
- Service account keys with proper permissions

---

## 🔐 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### 1. Go to GitHub Repository Settings

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### 2. Add These Secrets

#### GCP_SA_KEY
- **Name:** `GCP_SA_KEY`
- **Value:** Contents of your Google Cloud service account JSON key file
- **How to get:**
  1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
  2. Select your project
  3. Create or select a service account
  4. Go to **Keys** tab → **Add Key** → **Create New Key** → **JSON**
  5. Copy the entire JSON content

#### GCP_PROJECT_ID
- **Name:** `GCP_PROJECT_ID`
- **Value:** Your Google Cloud project ID (e.g., `bhishi-management`)

#### FIREBASE_SERVICE_ACCOUNT_KEY
- **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Value:** Single-line JSON string of your Firebase service account key
- **How to get:**
  ```bash
  # From project root, convert to single-line
  node -e "console.log(JSON.stringify(require('./service-account-key.json')))"
  ```
  Copy the entire output (it's a long single-line string)

#### FIREBASE_SERVICE_ACCOUNT
- **Name:** `FIREBASE_SERVICE_ACCOUNT`
- **Value:** Same as `FIREBASE_SERVICE_ACCOUNT_KEY` (for Firebase Hosting action)

#### FIREBASE_PROJECT_ID
- **Name:** `FIREBASE_PROJECT_ID`
- **Value:** Your Firebase project ID (e.g., `bhishi-management`)

#### FIREBASE_TOKEN
- **Name:** `FIREBASE_TOKEN`
- **Value:** Firebase CI token
- **How to get:**
  ```bash
  firebase login:ci
  ```
  Copy the token that's displayed

#### API_URL
- **Name:** `API_URL`
- **Value:** Your backend Cloud Run URL (e.g., `https://bhishi-backend-867590875581.us-central1.run.app`)

#### JWT_SECRET
- **Name:** `JWT_SECRET`
- **Value:** A strong random string (at least 32 characters)
- **How to generate:**
  ```bash
  openssl rand -base64 32
  ```

---

## ✅ Verify Secrets Are Set

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see all 8 secrets listed:
   - ✅ GCP_SA_KEY
   - ✅ GCP_PROJECT_ID
   - ✅ FIREBASE_SERVICE_ACCOUNT_KEY
   - ✅ FIREBASE_SERVICE_ACCOUNT
   - ✅ FIREBASE_PROJECT_ID
   - ✅ FIREBASE_TOKEN
   - ✅ API_URL
   - ✅ JWT_SECRET

---

## 🚀 How CI/CD Works

### Automatic Deployment

When you push to `firebase` branch:

1. **Backend Deployment:**
   - Builds Docker image
   - Deploys to Cloud Run
   - Sets environment variables

2. **Firestore Deployment:**
   - Deploys Firestore indexes
   - Deploys Firestore rules

3. **Frontend Deployment:**
   - Builds React app
   - Deploys to Firebase Hosting

### Manual Trigger

You can also trigger deployment manually:

1. Go to **Actions** tab in GitHub
2. Select **CI/CD - Deploy to Production** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

---

## 🔍 Check Deployment Status

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. Watch the progress:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (click to see error)

---

## 🐛 Troubleshooting

### Deployment Fails: "Permission denied"

**Solution:** Check service account permissions:
- Cloud Run Admin
- Cloud Build Service Account
- Firebase Admin SDK Administrator Service Agent

### Deployment Fails: "Secret not found"

**Solution:** Verify all secrets are set in GitHub Settings → Secrets

### Backend Deploys but Returns 500 Errors

**Solution:** Check Cloud Run logs:
```bash
gcloud run services logs read bhishi-backend --region us-central1 --limit 50
```

### Frontend Build Fails

**Solution:** Check build logs in GitHub Actions. Common issues:
- Missing environment variables
- TypeScript/ESLint errors
- Missing dependencies

---

## 🔄 Update CI/CD Workflow

The workflow file is located at:
```
.github/workflows/deploy.yml
```

To modify:
1. Edit the file
2. Commit and push
3. Changes take effect on next deployment

---

## 📝 Workflow Overview

The CI/CD workflow does the following:

1. **deploy-backend:**
   - Builds Docker container
   - Deploys to Cloud Run
   - Sets environment variables

2. **deploy-firestore:**
   - Deploys Firestore indexes
   - Deploys Firestore security rules

3. **deploy-frontend:**
   - Builds React app with production API URL
   - Deploys to Firebase Hosting

All jobs run in parallel where possible, but frontend waits for backend and Firestore to complete.

---

## 🎯 Best Practices

1. **Test Locally First:** Always test changes locally before pushing
2. **Small Commits:** Make small, focused commits for easier rollback
3. **Review Logs:** Check deployment logs if something fails
4. **Monitor:** Watch the Actions tab during deployment
5. **Rollback Plan:** Know how to rollback if needed (see DEPLOY_CHANGES.md)

---

**Your CI/CD is now set up! 🎉**

Every push to `firebase` will automatically deploy to production.

