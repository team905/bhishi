# 🚨 QUICK FIX: Backend Crashing with SQLITE_CANTOPEN

## The Problem
Your backend is trying to use SQLite instead of PostgreSQL because `DATABASE_URL` is not set.

## The Fix (2 Minutes)

### Step 1: Add DATABASE_URL to Backend Service

1. **In Railway Dashboard:**
   - Go to your **backend service** (the one showing "Crashed")
   - Click **"Variables"** tab

2. **Reference PostgreSQL DATABASE_URL:**
   - Click **"+ New Variable"** or **"Reference Variable"**
   - Select **"Reference Variable"**
   - **Service:** Select your PostgreSQL service
   - **Variable:** Select `DATABASE_URL`
   - Click **"Add"**

3. **Verify:**
   - You should see `DATABASE_URL` listed
   - It should show it's from the PostgreSQL service

### Step 2: Redeploy

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** button
3. Wait for deployment to complete

### Step 3: Check Logs

After redeploy, check **"Deploy Logs"**. You should see:
```
[Database] Using PostgreSQL (production mode)
Connected to PostgreSQL database
```

**NOT:**
```
[Database] Using SQLite (local development mode)  ❌
```

## If Reference Doesn't Work

### Manual Setup:

1. **Get DATABASE_URL:**
   - Go to **PostgreSQL service** → **"Variables"** tab
   - Copy the `DATABASE_URL` value

2. **Set in Backend:**
   - Go to **backend service** → **"Variables"** tab
   - Click **"+ New Variable"**
   - **Name:** `DATABASE_URL`
   - **Value:** Paste the connection string
   - Click **"Add"**

3. **Redeploy backend service**

## Why This Happens

Railway doesn't automatically share variables between services. You must explicitly reference `DATABASE_URL` from PostgreSQL to your backend.

## PostgreSQL Connection Stuck?

The "Attempting to connect..." in the PostgreSQL UI is just a UI issue. Your backend can still connect. Focus on fixing the backend first - once it's working, the PostgreSQL UI will eventually connect.

---

**After fixing, your backend should:**
- ✅ Show "Running" status
- ✅ Logs show "Using PostgreSQL"
- ✅ No more SQLITE_CANTOPEN errors
- ✅ Server starts successfully

