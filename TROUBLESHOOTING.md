# Troubleshooting Guide

## Login Issues

### Issue: "Login failed" even with correct credentials

**Solution Steps:**

1. **Verify Backend is Running**
   - Check if backend server is running on port 5005
   - Visit http://localhost:5005/api/health - should return JSON response
   - If not running, start it: `cd backend && npm run dev`

2. **Reset Admin Password**
   ```bash
   cd backend
   node scripts/reset-admin-password.js
   ```
   This will reset the admin password to `admin123`

3. **Check Database**
   - Ensure `backend/data/bhishi.db` exists
   - Verify admin user exists:
     ```bash
     cd backend
     sqlite3 data/bhishi.db "SELECT username, role, is_active FROM users WHERE username='admin';"
     ```

4. **Check Browser Console**
   - Open browser DevTools (F12)
   - Check Console tab for error messages
   - Check Network tab to see if API requests are being made
   - Verify the request URL is correct (should be `/api/auth/login`)

5. **Check Backend Logs**
   - Look at the terminal where backend is running
   - Should see console logs when login is attempted
   - Look for any error messages

6. **Verify Environment Variables**
   - Ensure `backend/.env` exists with:
     ```
     PORT=5005
     JWT_SECRET=your-secret-key-change-in-production
     NODE_ENV=development
     ```

7. **Check CORS**
   - If frontend is on different port, verify CORS is enabled in backend
   - Backend should have `app.use(cors())` in server.js

8. **Clear Browser Storage**
   - Open DevTools → Application/Storage → Local Storage
   - Clear all items
   - Try logging in again

### Common Error Messages

**"Invalid credentials"**
- Password might be incorrect
- User might not exist
- User might be inactive (is_active = 0)
- Solution: Reset admin password using the script

**"Network Error" or "Failed to fetch"**
- Backend server is not running
- Backend is on wrong port
- CORS issue
- Solution: Start backend server, check port configuration

**"Database error"**
- Database file might be corrupted
- Database permissions issue
- Solution: Delete `backend/data/bhishi.db` and restart server (will recreate)

**"Token is not valid"**
- JWT_SECRET mismatch
- Token expired
- Solution: Clear localStorage, check JWT_SECRET in .env

## Quick Fixes

### Reset Everything (Nuclear Option)
```bash
# Stop servers
# Delete database
rm backend/data/bhishi.db

# Restart backend (will recreate database and admin user)
cd backend
npm run dev
```

### Test API Directly
```bash
# Test login endpoint
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Should return JSON with token and user data.

### Verify Admin User in Database
```bash
cd backend
sqlite3 data/bhishi.db "SELECT id, username, email, role, is_active FROM users WHERE username='admin';"
```

Should show: `1|admin|admin@bhishi.com|admin|1`

## Still Having Issues?

1. Check all error messages in browser console
2. Check backend terminal for error logs
3. Verify all dependencies are installed: `npm install` in both backend and frontend
4. Make sure ports 3000 (frontend) and 5005 (backend) are not in use by other applications

