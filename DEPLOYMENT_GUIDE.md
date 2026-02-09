# Complete Deployment Guide - Bhishi Management System

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Local Development Setup](#part-1-local-development-setup)
4. [Part 2: Production Deployment](#part-2-production-deployment)
5. [Part 3: Environment Variables](#part-3-environment-variables)
6. [Part 4: Troubleshooting](#part-4-troubleshooting)
7. [Quick Reference](#quick-reference)

---

## Overview

This guide covers **complete setup** for both:
- **Local Development**: Using Firebase Emulator (no Firebase account needed)
- **Production**: Using Firebase Cloud (requires Firebase account)

**Architecture:**
- **Frontend**: React app → Firebase Hosting (production) or localhost:3000 (local)
- **Backend**: Express API → Cloud Run (production) or localhost:5005 (local)
- **Database**: Firestore → Firebase Cloud (production) or Emulator (local)

---

## Prerequisites

- [ ] Node.js 14+ installed
- [ ] npm installed
- [ ] **Java 21+ installed** (required for Firebase Emulator)
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Google Account (for production only)

### Install Java (Required for Emulator)

**Important**: Firebase Emulator requires **Java 21 or higher**.

**On macOS:**
```bash
# Option 1: Using Homebrew (Recommended)
brew install openjdk@21

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Option 2: Download from Adoptium (Eclipse Temurin)
# Visit: https://adoptium.net/
# Select: Java 21 (LTS) → macOS → .pkg installer
# Download and install the package
```

**Verify Java installation:**
```bash
java -version
# Should show: openjdk version "21.x.x" or higher
```

**If you get "Unable to locate a Java Runtime":**
- Install Java 21 using one of the methods above
- Restart your terminal after installation
- Verify with `java -version`
- Make sure version is 21 or higher

---

## Part 1: Local Development Setup

### Step 1.1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

### Step 1.2: Install Project Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 1.3: Initialize Firebase Emulator

**Important**: For local development, you DON'T need a Firebase account. The emulator works independently.

```bash
cd /path/to/bhishi  # Your project root

# Initialize ONLY emulators (not full Firebase project)
firebase init emulators
```

**When prompted:**

1. **"Which Firebase features do you want to set up?"**
   - Select: **Firestore Emulator** (press Space to select, then Enter)

2. **"Would you like to download the emulators now?"**
   - Answer: **Yes** (this downloads the emulator binaries)

3. **"Which port do you want to use for the Firestore emulator?"**
   - Press Enter for default: `8080`

4. **"Which port do you want to use for the Emulator UI?"**
   - Press Enter for default: `4000`

**If you get an error about "bhishi-local" project:**
- This is normal! The emulator doesn't need a real project.
- The `.firebaserc` file already has `bhishi-local` as a placeholder.
- The emulator will work fine even if the project doesn't exist in Firebase Console.
- Just continue with the emulator setup - it will work!

This creates/updates `firebase.json` with emulator configuration.

### Step 1.4: Configure .firebaserc

The `.firebaserc` file should have:

```json
{
  "projects": {
    "default": "bhishi-local",
    "local": "bhishi-local",
    "production": "your-production-project-id"
  }
}
```

**Note**: `bhishi-local` is just a placeholder name. It doesn't need to exist in Firebase Console. The emulator works without a real project.

### Step 1.5: Create Backend Environment File

Create `backend/.env`:

```env
# Local Development Configuration
FIREBASE_USE_EMULATOR=true
FIREBASE_PROJECT_ID=bhishi-local
FIRESTORE_EMULATOR_HOST=localhost:8080
NODE_ENV=development
PORT=5005
JWT_SECRET=local-development-secret-key-change-this
```

### Step 1.6: Start Firestore Emulator

**Terminal 1 - Start Emulator:**

```bash
firebase emulators:start --only firestore
```

You should see:
```
✔  firestore: Firestore Emulator running at localhost:8080
✔  ui: Emulator UI running at localhost:4000
```

**Keep this terminal running!** The emulator must stay running while you develop.

### Step 1.7: Start Backend Server

**Terminal 2 - Start Backend:**

```bash
cd backend
npm start
```

You should see:
```
[Firestore] Initializing with Firebase Emulator (local database)
[Firestore] Using LOCAL database via emulator at: localhost:8080
[Firestore] Database initialized successfully
Default admin user created (username: admin, password: admin123)
Server running on port 5005
```

### Step 1.8: Start Frontend

**Terminal 3 - Start Frontend:**

```bash
cd frontend
npm start
```

Frontend will open at `http://localhost:3000`

### Step 1.9: Verify Local Setup

1. **Check Emulator UI**: Visit `http://localhost:4000`
   - You should see Firestore emulator
   - Collections will appear when you use the app

2. **Test Backend**: 
   ```bash
   curl http://localhost:5005/api/health
   ```
   Should return: `{"status":"ok","message":"Bhishi Management System API"}`

3. **Test Frontend**: 
   - Visit `http://localhost:3000`
   - Login with: `admin` / `admin123`
   - Check Emulator UI to see collections created

### Step 1.10: Local Development Workflow

**Daily workflow:**
1. Start emulator: `firebase emulators:start --only firestore`
2. Start backend: `cd backend && npm start`
3. Start frontend: `cd frontend && npm start`
4. Develop and test
5. View data in Emulator UI: `http://localhost:4000`

**To reset local database:**
- Stop emulator (Ctrl+C)
- Restart emulator (data resets automatically)
- Or use Emulator UI to delete collections manually

---

## Part 2: Production Deployment

### Step 2.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add Project"**
3. Enter project name: `bhishi-management` (or your preferred name)
4. Enable Google Analytics (optional, recommended)
5. Click **"Create Project"**
6. Wait for project creation (30-60 seconds)
7. Click **"Continue"**

**Save your Project ID** - you'll need it everywhere!

### Step 2.2: Update .firebaserc

Update `.firebaserc` with your production project ID:

```json
{
  "projects": {
    "default": "bhishi-local",
    "local": "bhishi-local",
    "production": "your-actual-project-id-here"
  }
}
```

Replace `your-actual-project-id-here` with your Firebase project ID.

### Step 2.3: Link Firebase Project

```bash
# Link to production project
firebase use --add

# Select your production project from the list
# Alias: production
```

Verify:
```bash
firebase use production
firebase projects:list
```

### Step 2.4: Enable Required Services

#### A. Enable Firestore Database

1. Go to Firebase Console → **Firestore Database**
2. Click **"Create Database"**
3. Select **"Start in production mode"** (we'll deploy rules)
4. Choose a location (select closest to your users)
5. Click **"Enable"**

#### B. Enable Firebase Hosting

1. Go to Firebase Console → **Hosting**
2. Click **"Get Started"**
3. Click **"Next"** (we'll configure via CLI)

#### C. Enable Cloud Run (for Backend)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **APIs & Services** → **Library**
4. Search and enable:
   - **Cloud Run API**
   - **Cloud Build API**
   - **Container Registry API**

### Step 2.5: Deploy Firestore Rules and Indexes

```bash
# Make sure you're using production project
firebase use production

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

**Note**: Indexes may take a few minutes to build. Check status in Firebase Console.

### Step 2.6: Create Service Account for Backend

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **"Create Service Account"**
5. **Service account name**: `bhishi-backend`
6. Click **"Create and Continue"**
7. **Grant roles**:
   - `Cloud Run Admin`
   - `Firebase Admin SDK Administrator Service Agent`
8. Click **"Continue"** → **"Done"**
9. Click on the created service account
10. Go to **"Keys"** tab
11. Click **"Add Key"** → **"Create New Key"**
12. Select **JSON** format
13. Download the key file
14. **Save it securely** - DO NOT commit to Git!

### Step 2.7: Get Firebase Service Account Key

**You need a service account key for the backend to connect to Firestore:**

**Option A: From Firebase Console (Easier)**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `bhishi-management`
3. Click the gear icon ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** in the popup
7. A JSON file downloads (e.g., `bhishi-management-xxxxx-firebase-adminsdk-xxxxx.json`)
8. Save it as `service-account-key.json` in your project root

**Option B: From Google Cloud Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **IAM & Admin** → **Service Accounts**
4. Find the service account (usually `firebase-adminsdk-xxxxx@bhishi-management.iam.gserviceaccount.com`)
5. Click on it → **Keys** tab → **Add Key** → **Create New Key** → **JSON**
6. Download and save as `service-account-key.json`

**Convert to single-line string:**
```bash
# From project root
cat service-account-key.json | jq -c .
```

**Copy the entire output** (it's a long single-line JSON string) - you'll need it in the next step.

### Step 2.8: Deploy Backend to Cloud Run

#### Option A: Using gcloud CLI (Recommended)

**Install Google Cloud SDK:**
- Download from: https://cloud.google.com/sdk/docs/install
- Or use: `brew install google-cloud-sdk` (Mac)

**Authenticate:**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

**Note**: You may see a warning about 'environment' tag - this is safe to ignore. The project is set correctly. The warning is just Google Cloud suggesting you add a tag for organization purposes.

**Build and Deploy:**
```bash
cd backend

# Build container image (must be run from backend directory where Dockerfile is)
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/bhishi-backend .

# Note: The "." at the end is important - it tells gcloud to use current directory

# Get service account key as single-line string
# Method 1: Using Node.js (no jq needed)
export FIREBASE_SA_KEY=$(node -e "console.log(JSON.stringify(require('./service-account-key.json')))")

# Method 2: Using Python (alternative)
# export FIREBASE_SA_KEY=$(python3 -c "import json; print(json.dumps(json.load(open('service-account-key.json'))))")

# Method 3: Using jq (if installed)
# export FIREBASE_SA_KEY=$(cat service-account-key.json | jq -c .)

# Generate a JWT secret (or use your own)
export JWT_SECRET=$(openssl rand -base64 32)

# Create env vars file (handles JSON special characters better)
cat > /tmp/cloud-run-env-vars.yaml << EOF
FIREBASE_SERVICE_ACCOUNT_KEY: '$FIREBASE_SA_KEY'
NODE_ENV: 'production'
FIREBASE_USE_EMULATOR: 'false'
FIREBASE_PROJECT_ID: 'YOUR_PROJECT_ID'
JWT_SECRET: '$JWT_SECRET'
EOF

# Deploy to Cloud Run with ALL required environment variables
gcloud run deploy bhishi-backend \
  --image gcr.io/YOUR_PROJECT_ID/bhishi-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --env-vars-file=/tmp/cloud-run-env-vars.yaml

# Clean up
rm /tmp/cloud-run-env-vars.yaml

# Note: PORT is automatically set by Cloud Run - don't include it in --set-env-vars
```

**Important**: 
- Make sure you're in the `backend` directory when running the build command
- The `.` at the end of the build command is required - it specifies the build context (current directory)
- **The service account key MUST be set** - without it, the container will fail to start
- Replace `YOUR_PROJECT_ID` with `bhishi-management`

**If you already deployed without the service account key, update it:**

You have two options:

**Option 1: Update Environment Variables (Fix Failed Deployment)**

**Method A: Using jq (if installed)**
```bash
# From project root (/Users/shubham905/Documents/bhishi), get service account key as single-line string
export FIREBASE_SA_KEY=$(cat service-account-key.json | jq -c .)
```

**Method B: Without jq (Alternative - Use Node.js)**
```bash
# From project root, convert JSON to single-line using Node.js
export FIREBASE_SA_KEY=$(node -e "console.log(JSON.stringify(require('./service-account-key.json')))")
```

**Method C: Without jq (Alternative - Use Python)**
```bash
# From project root, convert JSON to single-line using Python
export FIREBASE_SA_KEY=$(python3 -c "import json; print(json.dumps(json.load(open('service-account-key.json'))))")
```

**Method D: Manual (If above don't work)**
1. Open `service-account-key.json` in a text editor
2. Copy the entire contents
3. Remove all line breaks (make it one long line)
4. Set it manually:
   ```bash
   export FIREBASE_SA_KEY='{"type":"service_account","project_id":"bhishi-management",...}'
   ```
   (Replace `...` with the rest of your JSON)

**Then continue with:**

**Method 1: Using env-vars-file (Recommended - Handles special characters)**
```bash
# Generate JWT secret if you don't have one
export JWT_SECRET=$(openssl rand -base64 32)

# Create a temporary env vars file
cat > /tmp/cloud-run-env-vars.yaml << EOF
FIREBASE_SERVICE_ACCOUNT_KEY: '$FIREBASE_SA_KEY'
NODE_ENV: 'production'
FIREBASE_USE_EMULATOR: 'false'
FIREBASE_PROJECT_ID: 'bhishi-management'
JWT_SECRET: '$JWT_SECRET'
EOF

# Update the existing Cloud Run service using the file
gcloud run services update bhishi-backend \
  --env-vars-file=/tmp/cloud-run-env-vars.yaml \
  --region us-central1

# Clean up
rm /tmp/cloud-run-env-vars.yaml
```

**Method 2: Using --set-env-vars with proper escaping**
```bash
# Generate JWT secret if you don't have one
export JWT_SECRET=$(openssl rand -base64 32)

# Update using --set-env-vars (note: use single quotes around JSON)
gcloud run services update bhishi-backend \
  --set-env-vars NODE_ENV=production,FIREBASE_USE_EMULATOR=false,FIREBASE_PROJECT_ID=bhishi-management,JWT_SECRET="$JWT_SECRET" \
  --update-env-vars FIREBASE_SERVICE_ACCOUNT_KEY="'$FIREBASE_SA_KEY'" \
  --region us-central1
```

**Note**: Method 1 (env-vars-file) is more reliable for complex JSON values.

**Important**: Run all commands from the **project root** (`/Users/shubham905/Documents/bhishi`), not from the `backend` directory.

**After updating, the service will automatically restart with the new environment variables.**

**Option 2: Secret Manager (More Secure)**
```bash
# Create secrets
echo -n "$(cat path/to/service-account-key.json)" | \
  gcloud secrets create firebase-sa-key --data-file=-

echo -n "your-strong-jwt-secret-min-32-chars" | \
  gcloud secrets create jwt-secret --data-file=-

# Deploy with secrets
gcloud run deploy bhishi-backend \
  --image gcr.io/YOUR_PROJECT_ID/bhishi-backend \
  --update-secrets FIREBASE_SERVICE_ACCOUNT_KEY=firebase-sa-key:latest,JWT_SECRET=jwt-secret:latest \
  --region us-central1
```

**Set JWT Secret:**
```bash
gcloud run services update bhishi-backend \
  --update-env-vars JWT_SECRET=your-strong-secret-key-minimum-32-characters \
  --region us-central1
```

#### Option B: Using Google Cloud Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click **"Create Service"**
3. **Deploy one revision from an existing container image**
4. **Container image URL**: `gcr.io/YOUR_PROJECT_ID/bhishi-backend`
5. **Service name**: `bhishi-backend`
6. **Region**: `us-central1`
7. **Authentication**: Allow unauthenticated invocations
8. **Container**: Port 5000
9. **Environment variables**: Add all from Step 2.8
10. Click **"Create"**

### Step 2.8: Get Backend URL

After deployment, Cloud Run provides a URL:
```
https://bhishi-backend-xxxxx-uc.a.run.app
```

**Save this URL** - you need it for frontend!

**Test Backend:**
```bash
curl https://your-backend-url.run.app/api/health
```

Should return: `{"status":"ok","message":"Bhishi Management System API"}`

### Step 2.9: Configure Frontend for Production

Create `frontend/.env.production`:

```env
REACT_APP_API_URL=https://your-backend-url.run.app
```

Replace with your actual Cloud Run URL.

### Step 2.10: Build Frontend

```bash
cd frontend
npm run build
```

This creates `frontend/build` directory with production files.

### Step 2.11: Deploy Frontend to Firebase Hosting

```bash
# Make sure you're using production project
firebase use production

# Deploy
firebase deploy --only hosting
```

### Step 2.12: Get Frontend URL

After deployment, Firebase provides URLs:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

**Save these URLs!**

### Step 2.13: Update CORS in Backend

The CORS is already configured in `backend/server.js`, but verify it includes your frontend domain.

If needed, update and redeploy:
```bash
cd backend
gcloud run deploy bhishi-backend --image gcr.io/YOUR_PROJECT_ID/bhishi-backend --region us-central1
```

### Step 2.14: Verify Production Deployment

1. **Test Frontend**: Visit your Firebase Hosting URL
2. **Test Login**: Use `admin` / `admin123`
3. **Check Firestore**: Go to Firebase Console → Firestore Database
   - Collections should be created automatically
4. **Test Backend**: 
   ```bash
   curl https://your-backend-url.run.app/api/health
   ```

---

## Part 3: Environment Variables

### Local Development (`backend/.env`)

```env
FIREBASE_USE_EMULATOR=true
FIREBASE_PROJECT_ID=bhishi-local
FIRESTORE_EMULATOR_HOST=localhost:8080
NODE_ENV=development
PORT=5005
JWT_SECRET=local-development-secret-key
```

**Frontend**: No env file needed (uses proxy in `package.json`)

### Production (Cloud Run)

**Set via gcloud:**
```bash
gcloud run services update bhishi-backend \
  --update-env-vars NODE_ENV=production \
  --update-env-vars FIREBASE_USE_EMULATOR=false \
  --update-env-vars FIREBASE_PROJECT_ID=your-project-id \
  --update-env-vars PORT=5000 \
  --update-env-vars JWT_SECRET=your-strong-secret \
  --update-env-vars FIREBASE_SERVICE_ACCOUNT_KEY="$(cat service-account-key.json | jq -c .)" \
  --region us-central1
```

**Or set in Cloud Console:**
- Go to Cloud Run → Your Service → Edit & Deploy New Revision
- Add environment variables in the "Variables & Secrets" section

### Production Frontend (Build-time)

Create `frontend/.env.production`:
```env
REACT_APP_API_URL=https://your-backend-url.run.app
```

---

## Part 4: Troubleshooting

### Local Development Issues

#### Error: "Failed to get Firebase project bhishi-local"

**Solution**: This is NORMAL! `bhishi-local` is just a placeholder. The emulator doesn't need a real project.

**Fix:**
1. Make sure you used `firebase init emulators` (not `firebase init`)
2. Verify emulator is running: `firebase emulators:start --only firestore`
3. Check `FIRESTORE_EMULATOR_HOST=localhost:8080` in `backend/.env`

#### Emulator Not Starting

**Error: "firebase-tools no longer supports Java version before 21" or "Unable to locate a Java Runtime"**

**Solution**: Install Java 21 or higher (required by Firebase Emulator).

**On macOS:**
```bash
# Install Java 21 using Homebrew
brew install openjdk@21

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify (must show version 21 or higher)
java -version
```

**Alternative - Download Installer:**
1. Visit: https://adoptium.net/
2. Select: **Java 21 (LTS)**
3. Platform: **macOS**
4. Architecture: **aarch64** (for M1/M2 Mac) or **x64** (for Intel Mac)
5. Package Type: **JDK**
6. Download and install the .pkg file
7. Restart terminal
8. Verify: `java -version`

**After installing Java:**
1. Restart your terminal
2. Verify: `java -version`
3. Try starting emulator again: `firebase emulators:start --only firestore`

**Other issues:**
```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill process if needed
kill -9 <PID>

# Start emulator again
firebase emulators:start --only firestore
```

#### Backend Can't Connect to Emulator

1. Verify emulator is running (check Terminal 1)
2. Check `FIRESTORE_EMULATOR_HOST=localhost:8080` in `backend/.env`
3. Restart backend after starting emulator
4. Check backend logs for connection errors

#### Frontend Can't Connect to Backend

1. Verify backend is running on port 5005
2. Check `proxy` in `frontend/package.json` points to `http://localhost:5005`
3. Check browser console for CORS errors
4. Restart frontend

### Production Issues

#### Error: "The following reserved env names were provided: PORT"

**Solution**: Cloud Run automatically sets the `PORT` environment variable. Don't include it in `--set-env-vars`.

**Fix:**
Remove `--set-env-vars PORT=5000` from your deployment command.

**Note**: The `--port 5000` flag is correct (tells Cloud Run which port your app listens on), but don't set `PORT` as an environment variable.

#### Error: "The user-provided container failed to start and listen on the port"

**Solution**: This usually means the container is crashing on startup, most commonly due to missing `FIREBASE_SERVICE_ACCOUNT_KEY`.

**Fix:**

1. **Check Cloud Run Logs:**
   ```bash
   gcloud run services logs read bhishi-backend --region us-central1 --limit 50
   ```
   
   Look for errors like:
   - "Firebase credentials not found"
   - "Failed to initialize database"
   - Any other startup errors

2. **Get Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Settings → Service Accounts
   - Click "Generate new private key" → Download JSON
   - Save as `service-account-key.json` in project root

3. **Update Cloud Run Service:**
   ```bash
   # From project root, convert JSON to single-line (choose one method):
   
   # Method 1: Using Node.js (recommended, no extra tools needed)
   export FIREBASE_SA_KEY=$(node -e "console.log(JSON.stringify(require('./service-account-key.json')))")
   
   # Method 2: Using Python (alternative)
   # export FIREBASE_SA_KEY=$(python3 -c "import json; print(json.dumps(json.load(open('service-account-key.json'))))")
   
   # Method 3: Using jq (if installed)
   # export FIREBASE_SA_KEY=$(cat service-account-key.json | jq -c .)
   
   # Generate JWT secret
   export JWT_SECRET=$(openssl rand -base64 32)
   
   # Create env vars file (handles JSON special characters properly)
   cat > /tmp/cloud-run-env-vars.yaml << EOF
   FIREBASE_SERVICE_ACCOUNT_KEY: '$FIREBASE_SA_KEY'
   NODE_ENV: 'production'
   FIREBASE_USE_EMULATOR: 'false'
   FIREBASE_PROJECT_ID: 'bhishi-management'
   JWT_SECRET: '$JWT_SECRET'
   EOF
   
   # Update service using the file (handles special characters correctly)
   gcloud run services update bhishi-backend \
     --env-vars-file=/tmp/cloud-run-env-vars.yaml \
     --region us-central1
   
   # Clean up
   rm /tmp/cloud-run-env-vars.yaml
   ```

4. **Wait for service to restart** (takes 1-2 minutes)

5. **Test again:**
   ```bash
   curl https://your-backend-url.run.app/api/health
   ```

#### Backend Not Starting

1. **Check Cloud Run Logs:**
   ```bash
   gcloud run services logs read bhishi-backend --region us-central1
   ```

2. **Verify Environment Variables:**
   - All required variables are set
   - `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
   - `FIREBASE_PROJECT_ID` matches your project

3. **Check Service Account Permissions:**
   - Service account has Firestore Admin role
   - Service account has Cloud Run permissions

#### Frontend Can't Connect to Backend

1. **Check CORS Settings:**
   - Verify `backend/server.js` includes your frontend domain
   - Redeploy backend after CORS changes

2. **Verify API URL:**
   - Check `REACT_APP_API_URL` in `frontend/.env.production`
   - Rebuild frontend after changing env vars

3. **Check Browser Console:**
   - Look for CORS errors
   - Check network tab for failed requests

#### Database Connection Failed

1. **Verify Service Account Key:**
   ```bash
   # Test if key is valid
   cat service-account-key.json | jq .project_id
   ```

2. **Check Firestore Rules:**
   - Rules are deployed: `firebase deploy --only firestore:rules`
   - Rules allow service account access

3. **Check Cloud Run Logs:**
   ```bash
   gcloud run services logs read bhishi-backend --region us-central1 --limit 50
   ```

#### Build Failures

1. **Check Node.js Version:**
   ```bash
   node --version  # Should be 14+
   ```

2. **Clear and Reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for Errors:**
   - Review build logs
   - Check for TypeScript/ESLint errors
   - Verify all dependencies are installed

---

## Quick Reference

### Local Development Commands

```bash
# Start emulator
firebase emulators:start --only firestore

# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm start

# View emulator UI
open http://localhost:4000
```

### Production Deployment Commands

```bash
# Switch to production project
firebase use production

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Build and deploy backend
cd backend
gcloud builds submit --tag gcr.io/PROJECT_ID/bhishi-backend
gcloud run deploy bhishi-backend --image gcr.io/PROJECT_ID/bhishi-backend --region us-central1

# Build frontend
cd frontend
REACT_APP_API_URL=https://backend-url.run.app npm run build

# Deploy frontend
firebase deploy --only hosting
```

### Check Current Project

```bash
# List all projects
firebase projects:list

# Check current project
firebase use

# Switch projects
firebase use local      # For local development
firebase use production # For production deployment
```

### View Logs

```bash
# Backend logs (Cloud Run)
gcloud run services logs read bhishi-backend --region us-central1

# Backend logs (local)
# Check terminal where backend is running

# Firestore logs (production)
# Go to Firebase Console → Firestore → Usage tab
```

### Important URLs

**Local:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5005
- Emulator UI: http://localhost:4000
- Firestore: localhost:8080

**Production:**
- Frontend: https://your-project-id.web.app
- Backend: https://your-backend-url.run.app
- Firebase Console: https://console.firebase.google.com
- Cloud Run Console: https://console.cloud.google.com/run

---

## Cost Estimation

### Free Tier (Generous!)

- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day
- **Hosting**: 10 GB storage, 360 MB/day transfer
- **Cloud Run**: 2 million requests/month, 400,000 GB-seconds

### Expected Monthly Costs

**Small Usage (< 100 users):**
- Firestore: $0 (within free tier)
- Hosting: $0 (within free tier)
- Cloud Run: $0-5/month

**Medium Usage (100-1000 users):**
- Firestore: $0-10/month
- Hosting: $0/month
- Cloud Run: $5-20/month

**Total**: ~$0-30/month for most use cases

---

## Security Checklist

- [ ] Service account key secured (not in Git)
- [ ] `.env` files in `.gitignore`
- [ ] `JWT_SECRET` is strong (32+ characters, random)
- [ ] Firestore security rules deployed and tested
- [ ] CORS configured correctly
- [ ] Environment variables not exposed in code
- [ ] HTTPS enabled (automatic with Firebase/Cloud Run)

---

## Next Steps After Deployment

1. **Set Up Monitoring:**
   - Enable Cloud Run metrics
   - Set up Firebase Analytics
   - Configure alerts

2. **Backup Strategy:**
   - Export Firestore data regularly
   - Keep service account keys secure

3. **Scaling:**
   - Monitor Cloud Run metrics
   - Adjust min/max instances as needed
   - Set up auto-scaling

4. **Custom Domain:**
   - Add custom domain in Firebase Hosting
   - Configure DNS as instructed
   - Wait for SSL certificate

---

## Support & Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Emulator Docs**: https://firebase.google.com/docs/emulator-suite

---

## Summary

### Local Development
1. Install Firebase CLI
2. Initialize emulators: `firebase init emulators`
3. Start emulator: `firebase emulators:start --only firestore`
4. Create `backend/.env` with emulator config
5. Start backend: `cd backend && npm start`
6. Start frontend: `cd frontend && npm start`

### Production Deployment
1. Create Firebase project
2. Enable Firestore, Hosting, Cloud Run
3. Deploy Firestore rules/indexes
4. Create service account and download key
5. Build and deploy backend to Cloud Run
6. Build frontend with backend URL
7. Deploy frontend to Firebase Hosting

**That's it! Your app is now live! 🎉**
