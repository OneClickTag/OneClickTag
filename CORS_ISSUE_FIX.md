# CORS Issue Fix - December 2025

## Problem

Dev frontend (`https://dev.oneclicktag.com`) was calling production API (`https://api.oneclicktag.com`) instead of dev API (`https://dev-api.oneclicktag.com`), causing:

```
Access to XMLHttpRequest at 'https://api.oneclicktag.com/api/v1/landing/hero'
from origin 'https://dev.oneclicktag.com' has been blocked by CORS policy
```

## Root Cause

**Vite Environment File Loading Order**:
1. `.env.production` (when `NODE_ENV=production`)
2. `.env.local`
3. `.env`

The issue:
- ❌ `frontend/.env.production` was committed to the repo with hardcoded production API URL
- ✅ GitHub workflow downloads environment-specific config from S3 to `frontend/.env`
- ❌ But `.env.production` has higher priority and overrides it!
- ❌ Result: All environments (dev, stage, prod) used the production API URL

## Solution

**Removed the hardcoded `frontend/.env.production` file** so the S3-downloaded `.env` file is used correctly.

### Changes Made:

1. **Deleted** `frontend/.env.production` (contained hardcoded production API)
2. **Updated** `.gitignore` to prevent future `.env.production` files from being committed
3. **Backend CORS** already correctly configured with `CORS_ORIGIN` environment variable

### Files Modified:
- ❌ Deleted: `frontend/.env.production`
- ✅ Updated: `.gitignore` (added `*.env.production`)
- ✅ Updated: `backend/src/main.ts` (CORS configuration with logging)
- ✅ Updated: `backend/.env`, `backend/.env.example` (changed to `CORS_ORIGIN`)

## Environment Configuration (S3)

Each environment now correctly uses its own configuration from S3:

### Dev Environment (`s3://oneclicktag-env-store-dev/`)

**frontend.env**:
```bash
VITE_API_BASE_URL=https://dev-api.oneclicktag.com
```

**api.env**:
```bash
CORS_ORIGIN=https://dev.oneclicktag.com
```

### Stage Environment (`s3://oneclicktag-env-store-stage/`)

**frontend.env**:
```bash
VITE_API_BASE_URL=https://stage-api.oneclicktag.com
```

**api.env**:
```bash
CORS_ORIGIN=https://stage.oneclicktag.com
```

### Production Environment (`s3://oneclicktag-env-store-prod/`)

**frontend.env**:
```bash
VITE_API_BASE_URL=https://api.oneclicktag.com
```

**api.env**:
```bash
CORS_ORIGIN=https://oneclicktag.com
```

## How It Works Now

1. **GitHub Workflow** (`deploy.yml`) downloads `frontend.env` from S3 based on environment:
   ```yaml
   aws s3 cp s3://oneclicktag-env-store-${ENV}/frontend.env frontend/.env
   ```

2. **Docker Build** copies the downloaded `.env` file:
   ```dockerfile
   COPY frontend ./frontend  # includes .env file
   ```

3. **Vite Build** embeds the environment variables into the JavaScript bundle:
   ```bash
   pnpm vite build  # VITE_* vars are baked into the build
   ```

4. **Result**: Each environment uses the correct API URL! ✅

## Testing

After redeploying, verify the fix:

1. **Check build logs** for correct API URL:
   ```
   Building with VITE_API_BASE_URL=https://dev-api.oneclicktag.com
   ```

2. **Check browser console** - no more CORS errors

3. **Check Network tab** - API calls go to correct environment:
   - Dev: `https://dev-api.oneclicktag.com/api/v1/...`
   - Stage: `https://stage-api.oneclicktag.com/api/v1/...`
   - Prod: `https://api.oneclicktag.com/api/v1/...`

4. **Check backend logs** for CORS message:
   ```
   🌐 CORS enabled for origins: [ 'https://dev.oneclicktag.com' ]
   ```

## Next Steps

1. **Push the commit**:
   ```bash
   git push origin master
   ```

2. **Redeploy the frontend** (the backend doesn't need redeployment):
   ```
   GitHub Actions → Deploy to AWS ECS
   Service: frontend
   Environment: dev (or stage/prod)
   ```

3. **Verify** the fix in the browser

## Prevention

To prevent this issue in the future:

1. ✅ Never commit `.env.production` files to the repo
2. ✅ Always use S3 for environment-specific configuration
3. ✅ The `.gitignore` now blocks `*.env.production` files
4. ✅ Use `.env.local` for local development only (already in `.gitignore`)

## Additional Notes

- **Local Development**: Use `.env.local` (already configured correctly)
- **CORS Configuration**: Backend uses `CORS_ORIGIN` environment variable (supports multiple origins with comma separation)
- **Frontend Config**: Uses `VITE_API_BASE_URL` which auto-appends `/api` via `getBaseURL()` helper

---

**Issue**: CORS error with dev frontend calling production API
**Root Cause**: Committed `.env.production` file overriding S3 config
**Fix**: Removed hardcoded file, now uses S3 per-environment config
**Status**: ✅ Fixed - Ready to redeploy
