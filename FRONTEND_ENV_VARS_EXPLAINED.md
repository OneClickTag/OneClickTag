# Frontend Environment Variables - Critical Understanding

## 🔥 The Problem

After updating Firebase credentials in the environment file and redeploying, the frontend still showed:
```
FirebaseError: Firebase: Error (auth/invalid-api-key)
```

**Why?** Because Vite works differently than backend frameworks!

## 🎯 Key Difference: Build Time vs Runtime

### Backend (NestJS/Node.js) - Runtime Variables ✅
```
┌─────────────┐     ┌──────────┐     ┌─────────────┐
│   api.env   │ --> │  Docker  │ --> │   Runtime   │
│  in S3      │     │  Image   │     │ Reads .env  │
└─────────────┘     └──────────┘     └─────────────┘
```
- Environment variables are read when the container **starts**
- Changing the `.env` file → restart container → new values loaded ✅

### Frontend (Vite/React) - Build Time Variables ⚠️
```
┌─────────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────┐
│ frontend.env│ --> │  Vite Build  │ --> │   HTML   │ --> │ Browser │
│             │     │  (compile)   │     │   + JS   │     │ (user)  │
└─────────────┘     └──────────────┘     └──────────┘     └─────────┘
         ↓                  ↓
    Must exist        Embeds values
    BEFORE build      into JavaScript
```
- Environment variables are **embedded into JavaScript** during the `vite build` command
- The built JavaScript files contain hardcoded values
- Changing the `.env` file → **REBUILD required** → new Docker image → deploy ✅

## 📋 What Was Wrong

### Before Fix:

1. **Updated `frontend.env` in S3** ✅
2. **Triggered "redeploy"** ❌
   - This just restarts the container with the same Docker image
   - The Docker image still contains JavaScript built with OLD env vars
   - Firebase still has the old/missing API key

### What Actually Happens:

```javascript
// In the OLD Docker image, the JavaScript looks like:
const firebaseConfig = {
  apiKey: undefined,  // ❌ No value at build time
  authDomain: undefined,
  // ...
}

// After rebuild, the JavaScript looks like:
const firebaseConfig = {
  apiKey: "AIzaSyBA5lsVEOExyXoLTkReuW260zhS4TbYe24",  // ✅ Embedded at build time
  authDomain: "one-click-tag-5fade.firebaseapp.com",
  // ...
}
```

## ✅ The Fix

### Updated `.github/workflows/deploy.yml`:

```yaml
- name: Download environment file from S3
  run: |
    echo "📥 Downloading environment file from S3..."
    aws s3 cp s3://oneclicktag-env-store-${{ github.event.inputs.environment }}/frontend.env frontend/.env --region $AWS_REGION
    echo "✅ Environment file downloaded"

- name: Build and push Docker image
  run: |
    # Build with unique tag (environment variables will be baked into the build)
    docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f frontend/Dockerfile .
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
```

### Key Points:
1. **Download `.env` from S3 BEFORE building** Docker image
2. The `.env` file is in the `frontend/` directory when `COPY frontend ./frontend` runs
3. Vite reads the `.env` file during `pnpm vite build`
4. Environment variables get embedded into the JavaScript bundle
5. The new Docker image contains the updated JavaScript

## 🔍 How to Verify Environment Variables Are Embedded

### Method 1: Check Built Files
```bash
# After building locally
cd frontend/dist/assets
grep -r "VITE_FIREBASE_API_KEY" *.js
# Should find the actual API key embedded in the JavaScript
```

### Method 2: Check Browser Console
```javascript
// In browser console:
console.log(import.meta.env.VITE_FIREBASE_API_KEY)
// Should show the actual API key, not undefined
```

### Method 3: Check Source in DevTools
1. Open browser DevTools
2. Go to Sources tab
3. Find `index-*.js` file
4. Search for "firebase" or "apiKey"
5. You should see the actual values embedded in the code

## 📝 Important Rules for Frontend Environment Variables

### ✅ DO:
1. **Always rebuild** the Docker image when env vars change
2. **Prefix variables** with `VITE_` for them to be available
3. **Update S3** before triggering a build
4. **Use the GitHub Actions workflow** to deploy (it handles this correctly now)

### ❌ DON'T:
1. **Don't expect** env var changes to take effect with just a container restart
2. **Don't reuse** old Docker images when env vars have changed
3. **Don't commit** `.env` files to git (they're environment-specific)
4. **Don't use** `FORCE_NEW_DEPLOYMENT` without rebuilding the image

## 🚀 Correct Deployment Flow

### When You Update Frontend Environment Variables:

1. **Update the S3 file**:
   ```bash
   # Edit the file locally
   vim /Users/orharazi/oneclicktag/frontend/frontend.env

   # Upload to S3
   aws s3 cp frontend/frontend.env s3://oneclicktag-env-store-dev/frontend.env --region eu-central-1
   ```

2. **Trigger a NEW BUILD** (don't just redeploy):
   ```
   Go to: GitHub Actions → Deploy to AWS ECS
   Select: frontend, dev
   Run workflow
   ```

   This will:
   - Download the NEW frontend.env from S3 ✅
   - Build a NEW Docker image with embedded env vars ✅
   - Push the image to ECR ✅
   - Update ECS to use the new image ✅

3. **Verify**:
   ```bash
   # Check the deployment
   curl https://dev.oneclicktag.com

   # Check browser console
   # The Firebase error should be gone
   ```

## 🆚 Backend vs Frontend Comparison

| Aspect | Backend (NestJS) | Frontend (Vite) |
|--------|------------------|-----------------|
| **When env vars loaded** | Runtime (container start) | Build time (Docker build) |
| **Can change without rebuild?** | ✅ Yes (restart container) | ❌ No (rebuild required) |
| **Where values live** | .env file | Embedded in JavaScript |
| **Visible in browser?** | ❌ No (server-side) | ✅ Yes (VITE_* only) |
| **Secrets safe?** | ✅ Yes | ⚠️ Public (only non-sensitive) |
| **Update process** | Update S3 → Restart | Update S3 → Rebuild → Deploy |

## 🔒 Security Note

Frontend environment variables are **PUBLIC** and visible to anyone who inspects the JavaScript code in their browser.

### Safe for Frontend:
- ✅ API URLs
- ✅ Firebase config (public by design)
- ✅ Feature flags
- ✅ Public API keys

### NEVER Put in Frontend:
- ❌ Database credentials
- ❌ API secrets
- ❌ Private keys
- ❌ OAuth client secrets
- ❌ Admin passwords

## 📚 Additional Resources

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [Why Vite Doesn't Use process.env](https://vitejs.dev/guide/env-and-mode.html#env-variables-and-modes)
- [Firebase Web Config (Public Keys)](https://firebase.google.com/docs/web/setup#config-object)

## 🎓 Summary

**The Golden Rule**: When you change frontend environment variables, you must **REBUILD the Docker image**, not just redeploy or restart containers.

```
Changed .env → Rebuild Docker Image → New Deployment
            ↑
      THIS STEP IS REQUIRED!
      (It's now automated in the workflow)
```
