# 🔧 Quick Fix: CI/CD Permission Error

## Error Message
```
ERROR: (gcloud.builds.submit) PERMISSION_DENIED: The caller does not have permission.
```

## Quick Fix Steps

### Step 1: Grant Permissions to Your Service Account

1. **Go to [Google Cloud Console - Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)**
2. **Find your service account** (the one you're using in GitHub secret `GCP_SA_KEY`)
3. **Click on it** → Click **"Permissions"** tab
4. **Click "Grant Access"** button
5. **Add these roles:**
   - `Cloud Build Service Account` (or `Cloud Build Editor`)
   - `Cloud Run Admin`
   - `Service Account User`
   - `Storage Admin`
   - `Firebase Admin SDK Administrator Service Agent`
6. **Click "Save"**

### Step 2: Grant Permissions to Cloud Build Service Account

1. **Go to [IAM & Admin → IAM](https://console.cloud.google.com/iam-admin/iam)**
2. **Find:** `[YOUR-PROJECT-NUMBER]@cloudbuild.gserviceaccount.com`
   - Example: `123456789012@cloudbuild.gserviceaccount.com`
3. **Click the pencil icon (Edit)** next to it
4. **Add these roles:**
   - `Cloud Run Admin` (so Cloud Build can deploy)
   - `Service Account User` (so Cloud Build can use service accounts)
5. **Click "Save"**

### Step 3: Enable Required APIs

Make sure these APIs are enabled:

1. **Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)**
2. **Enable these APIs:**
   - ✅ Cloud Build API
   - ✅ Cloud Run API
   - ✅ Container Registry API (or Artifact Registry API)
   - ✅ Cloud Resource Manager API

### Step 4: Wait and Retry

1. **Wait 1-2 minutes** for permissions to propagate
2. **Retry deployment:**
   ```bash
   # Push to firebase branch again
   git push origin firebase
   ```

## Verify Permissions

To verify your service account has the right permissions:

```bash
# List service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

## Still Not Working?

1. **Check the service account email** in the error message
2. **Verify it matches** the one in your GitHub secret `GCP_SA_KEY`
3. **Check Cloud Build logs:**
   - Go to [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
   - Look for failed builds and error messages

## Alternative: Use Default Compute Service Account

If you continue having issues, you can use the default compute service account:

1. **Go to [IAM & Admin → IAM](https://console.cloud.google.com/iam-admin/iam)**
2. **Find:** `[PROJECT-NUMBER]-compute@developer.gserviceaccount.com`
3. **Grant it the same roles** as above
4. **Update GitHub secret** `GCP_SA_KEY` with this service account's key

---

**After fixing permissions, push to `firebase` branch again!** 🚀

