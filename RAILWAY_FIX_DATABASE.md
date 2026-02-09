# Fix: Backend Using SQLite Instead of PostgreSQL on Railway

## Problem
Your backend service is crashing with `SQLITE_CANTOPEN` error because it's trying to use SQLite instead of PostgreSQL.

## Root Cause
The `DATABASE_URL` environment variable is not being passed from the PostgreSQL service to your backend service.

## Solution

### Step 1: Link DATABASE_URL in Backend Service

1. **Go to Railway Dashboard**
   - Navigate to your project
   - Click on your **backend service** (the one that's crashing - "bhishi")

2. **Go to Variables Tab**
   - Click on the **"Variables"** tab in your backend service

3. **Reference PostgreSQL DATABASE_URL**
   - Click **"+ New Variable"** or **"Reference Variable"** button
   - Select **"Reference Variable"**
   - In the dropdown, select your **PostgreSQL service**
   - Select **`DATABASE_URL`** from the list
   - Click **"Add"**

4. **Verify Variable is Set**
   - You should see `DATABASE_URL` listed in your backend service variables
   - It should show it's referenced from the PostgreSQL service

### Step 2: Redeploy Backend Service

1. **Go to Deployments Tab**
   - In your backend service, click **"Deployments"** tab

2. **Redeploy**
   - Click **"Redeploy"** button
   - Or push a new commit to trigger auto-deploy

3. **Check Logs**
   - After redeploy, go to **"Deploy Logs"** tab
   - You should see: `[Database] Using PostgreSQL (production mode)`
   - Instead of: `[Database] Using SQLite (local development mode)`

### Step 3: Verify Database Connection

After redeploy, check the logs for:
- ✅ `Connected to PostgreSQL database`
- ✅ `PostgreSQL tables created/verified`
- ✅ `Database initialized successfully`
- ✅ `Server running on port 5005`

## Alternative: Manual DATABASE_URL Setup

If referencing doesn't work, you can manually set it:

1. **Get DATABASE_URL from PostgreSQL Service**
   - Go to your **PostgreSQL service**
   - Click **"Variables"** tab
   - Find **`DATABASE_URL`**
   - Copy the entire value (it's a long connection string)

2. **Set in Backend Service**
   - Go to your **backend service**
   - Click **"Variables"** tab
   - Click **"+ New Variable"**
   - **Name:** `DATABASE_URL`
   - **Value:** Paste the connection string you copied
   - **Environment:** Select all (Production, Preview, Development)
   - Click **"Add"**

3. **Redeploy**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"**

## Why This Happens

The backend code checks for `DATABASE_URL`:
- ✅ **If `DATABASE_URL` is set:** Uses PostgreSQL
- ❌ **If `DATABASE_URL` is NOT set:** Uses SQLite (causes crash on Railway)

Railway doesn't automatically share variables between services - you need to explicitly reference them.

## PostgreSQL Connection Stuck Issue

If PostgreSQL shows "Attempting to connect..." for a long time:

1. **Check PostgreSQL Service Status**
   - Go to PostgreSQL service → **"Deployments"** tab
   - Make sure it shows "ACTIVE" and "Deployment successful"

2. **Restart PostgreSQL Service**
   - Go to PostgreSQL service → **"Settings"** tab
   - Click **"Restart"** or **"Redeploy"**

3. **Check Variables**
   - Go to PostgreSQL service → **"Variables"** tab
   - Verify `DATABASE_URL` exists and has a value

4. **Wait a Bit**
   - Sometimes Railway's database UI takes time to connect
   - The backend can still connect even if the UI shows "Attempting..."

## Quick Checklist

- [ ] Backend service has `DATABASE_URL` variable (referenced from PostgreSQL)
- [ ] Backend service redeployed after adding `DATABASE_URL`
- [ ] Deploy logs show "Using PostgreSQL" not "Using SQLite"
- [ ] No more `SQLITE_CANTOPEN` errors
- [ ] Backend service shows "Running" status

## Expected Logs After Fix

```
[Database] Using PostgreSQL (production mode)
Connected to PostgreSQL database
PostgreSQL tables created/verified
Default admin user created (username: admin, password: admin123)
Database initialized successfully
Server running on port 5005
```

If you see these logs, everything is working! ✅

