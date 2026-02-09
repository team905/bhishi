# 🚀 Quick Start Guide - Daily Development

This guide shows you how to **start** the project for daily development work (both local and production).

---

## 📍 Local Development (Daily Start)

### Prerequisites Check
```bash
# Verify Java 21+ is installed (required for Firestore Emulator)
java -version

# Verify Node.js is installed
node -v
npm -v

# Verify Firebase CLI is installed
firebase --version
```

### Step 1: Start Firestore Emulator

**Terminal 1 - Start Emulator:**
```bash
# Navigate to project root
cd /Users/shubham905/Documents/bhishi

# Start Firestore emulator only
firebase emulators:start --only firestore
```

**✅ Success:** You should see:
```
✔  firestore: Firestore Emulator running at localhost:8080
✔  ui: Emulator UI running at http://localhost:4000
```

**Keep this terminal open!** The emulator must stay running.

---

### Step 2: Start Backend Server

**Terminal 2 - Start Backend:**
```bash
# Navigate to backend directory
cd backend

# Make sure .env file exists with these variables:
# FIREBASE_USE_EMULATOR=true
# FIREBASE_PROJECT_ID=bhishi-local
# FIRESTORE_EMULATOR_HOST=localhost:8080
# NODE_ENV=development
# PORT=5005
# JWT_SECRET=local-development-secret-key

# Start backend server
npm run dev
```

**✅ Success:** You should see:
```
[Firestore] Initializing with Firebase Emulator (local database)
[Firestore] Using LOCAL database via emulator at: localhost:8080
[Firestore] Database initialized successfully
Server running on port 5005
```

---

### Step 3: Start Frontend

**Terminal 3 - Start Frontend:**
```bash
# Navigate to frontend directory
cd frontend

# Start React development server
npm start
```

**✅ Success:** Browser should automatically open to `http://localhost:3000`

---

### 🎯 Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5005
- **Firestore Emulator UI:** http://localhost:4000
- **Health Check:** http://localhost:5005/api/health

---

### 🛑 Stopping Local Development

1. **Stop Frontend:** Press `Ctrl+C` in Terminal 3
2. **Stop Backend:** Press `Ctrl+C` in Terminal 2
3. **Stop Emulator:** Press `Ctrl+C` in Terminal 1

---

## 🌐 Production (Daily Start - View Only)

**Note:** Production is already deployed. You don't need to "start" it - it's always running!

### Access Production

- **Frontend:** https://bhishi-management.web.app
- **Backend API:** https://bhishi-backend-867590875581.us-central1.run.app
- **Health Check:** https://bhishi-backend-867590875581.us-central1.run.app/api/health

### View Production Logs

```bash
# View backend logs
gcloud run services logs read bhishi-backend --region us-central1 --limit 50

# Follow logs in real-time
gcloud run services logs tail bhishi-backend --region us-central1
```

### View Firestore Data (Production)

1. Go to [Firebase Console](https://console.firebase.google.com/project/bhishi-management/firestore/data)
2. Navigate to your collections

---

## 🔧 Troubleshooting

### Emulator Won't Start

**Error:** "Java not found" or "Java version before 21"
```bash
# Install Java 21+
brew install openjdk@21

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
java -version
```

### Backend Can't Connect to Emulator

1. **Check emulator is running** (Terminal 1)
2. **Verify `.env` file** in `backend/` directory:
   ```env
   FIREBASE_USE_EMULATOR=true
   FIRESTORE_EMULATOR_HOST=localhost:8080
   ```
3. **Restart backend** after starting emulator

### Frontend Can't Connect to Backend

1. **Check backend is running** on port 5005
2. **Verify proxy** in `frontend/package.json`:
   ```json
   "proxy": "http://localhost:5005"
   ```
3. **Restart frontend**

### Port Already in Use

```bash
# Find process using port 5005
lsof -i :5005

# Kill process (replace PID with actual process ID)
kill -9 <PID>

# Or use different port
# In backend/.env, change PORT=5006
# In frontend/package.json, change proxy to http://localhost:5006
```

---

## 📝 Quick Commands Reference

```bash
# Start everything (local)
# Terminal 1:
firebase emulators:start --only firestore

# Terminal 2:
cd backend && npm run dev

# Terminal 3:
cd frontend && npm start

# Check if services are running
curl http://localhost:5005/api/health
curl http://localhost:3000

# View emulator data
open http://localhost:4000
```

---

## 🎓 Default Login Credentials

**Local Development:**
- Username: `admin`
- Password: `admin123`

**Production:**
- Use the credentials you set up during deployment

---

**Happy Coding! 🚀**

