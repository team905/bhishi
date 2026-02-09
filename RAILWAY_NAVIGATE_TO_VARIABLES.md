# How to Set Variables in Railway - Step by Step

## ❌ You're Currently On: Project Settings → Shared Variables
This is for project-wide variables. You need **service-level variables**.

## ✅ Where You Need to Go: Backend Service → Variables

### Step-by-Step Navigation:

1. **Go Back to Project Dashboard**
   - Click the **"Architecture"** tab at the top (or click the Railway logo)
   - This takes you to the main project view

2. **Find Your Backend Service**
   - Look for the service named **"bhishi"** (the one that's crashed)
   - It should show a red "Crashed" status
   - Click on that service card/box

3. **Open the Service**
   - You'll see service details at the top
   - Look for tabs: **"Details"**, **"Build Logs"**, **"Deploy Logs"**, **"Variables"**, etc.

4. **Click "Variables" Tab**
   - This is where you set variables for THIS specific service
   - You should see a list of existing variables (or empty if none)

5. **Add DATABASE_URL**
   - Click **"+ New Variable"** or **"Reference Variable"** button
   - Select **"Reference Variable"**
   - **From Service:** Select your **PostgreSQL** service
   - **Variable Name:** Select **`DATABASE_URL`**
   - Click **"Add"**

## Visual Guide:

```
Railway Dashboard
└── Your Project (cooperative-mercy)
    └── Architecture Tab (main view)
        ├── PostgreSQL Service (elephant icon)
        └── Backend Service "bhishi" (crashed) ← CLICK THIS
            └── Variables Tab ← GO HERE
                └── Reference Variable
                    └── Select PostgreSQL → DATABASE_URL
```

## Alternative: Quick Access

1. **From the URL bar:**
   - Your current URL shows: `/project/.../settings/variables`
   - Change it to: `/project/.../service/[YOUR_BACKEND_SERVICE_ID]`
   - Or just click "Architecture" tab and find your backend service

2. **From Service List:**
   - In Architecture view, you'll see all services
   - Click on the **"bhishi"** service (the crashed one)
   - Then click **"Variables"** tab

## What You Should See:

After clicking on your backend service and going to Variables tab:

- **Empty list** (if no variables set yet)
- OR existing variables like `PORT`, `NODE_ENV`, etc.
- A button: **"+ New Variable"** or **"Reference Variable"**

## If You Can't Find "Reference Variable":

1. Click **"+ New Variable"**
2. **Name:** `DATABASE_URL`
3. **Value:** You need to get this from PostgreSQL service:
   - Go to **PostgreSQL service** → **"Variables"** tab
   - Copy the `DATABASE_URL` value
   - Paste it in the backend service variable

## Quick Checklist:

- [ ] Left Project Settings (Shared Variables page)
- [ ] Clicked "Architecture" tab
- [ ] Found backend service "bhishi" (crashed)
- [ ] Clicked on "bhishi" service
- [ ] Clicked "Variables" tab
- [ ] Added/Referenced `DATABASE_URL` from PostgreSQL service
- [ ] Redeployed backend service

---

**Remember:** Service variables are different from Shared Variables!
- **Shared Variables** = Project-wide (what you're on now)
- **Service Variables** = Specific to one service (what you need)

