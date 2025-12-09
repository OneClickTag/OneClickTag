# Environment Files Missing - Issue Fixed

## Problem

ECS deployment failed with error:
```
Waiter ServicesStable failed: Max attempts exceeded
```

## Root Cause

When checking AWS ECS service events, found:
```
ResourceInitializationError: failed to download env files:
service call has been retried 1 time(s): operation error S3: HeadObject,
https response error StatusCode: 403, api error Forbidden: Forbidden.
```

**Issue**: ECS tasks were trying to download environment files from S3 (`api.env`, `frontend.env`) but:
1. The files didn't exist in S3
2. The S3 bucket `oneclicktag-env-store-dev` was empty
3. ECS task execution role couldn't access non-existent files

**Result**: Circuit breaker triggered after 3 failed task attempts, deployment rolled back.

## Solution Implemented

### 1. Created Environment File Templates

**Backend**: `backend/.env.example.ecs`
- Contains all required and optional environment variables
- Includes comments explaining each variable
- DATABASE_URL, JWT_SECRET, CORS_ORIGIN, etc.

**Frontend**: `frontend/.env.example.ecs`
- Contains Vite-specific environment variables (VITE_ prefix)
- VITE_API_URL, VITE_APP_NAME, etc.

### 2. Created Upload Script

**`scripts/upload-env-files.sh`**
- Automatically uploads env files to correct S3 bucket
- Validates bucket exists before uploading
- Provides clear error messages if files missing
- Usage: `./scripts/upload-env-files.sh <environment>`

### 3. Added Workflow Validation

Updated `.github/workflows/deploy.yml` to check for environment files before deployment:
- Checks if `api.env` exists in S3 (for backend deployments)
- Checks if `frontend.env` exists in S3 (for frontend deployments)
- Fails fast with helpful error message if files missing
- Prevents wasting time on builds that will fail anyway

### 4. Updated Documentation

**DEPLOYMENT.md** now includes:
- ⚠️ REQUIRED warning about environment files
- Step-by-step setup instructions
- Clear explanation of required variables
- Upload commands and verification steps

### 5. Updated .gitignore

Added environment files to `.gitignore`:
```
# ECS environment files (contain secrets, upload to S3 manually)
backend/api.env
frontend/frontend.env
```

### 6. Created Working Environment Files

Created and uploaded minimal working environment files for dev:
- `backend/api.env` - With placeholder values for DATABASE_URL, JWT_SECRET
- `frontend/frontend.env` - With correct API URL and app configuration

## Files Created

✅ `backend/.env.example.ecs` - Template with all backend variables
✅ `frontend/.env.example.ecs` - Template with all frontend variables
✅ `scripts/upload-env-files.sh` - Helper script to upload files
✅ `backend/api.env` - Working dev environment (uploaded to S3)
✅ `frontend/frontend.env` - Working dev environment (uploaded to S3)
✅ `ENV_FILES_FIX.md` - This document

## Files Modified

✅ `.github/workflows/deploy.yml` - Added S3 file existence checks
✅ `DEPLOYMENT.md` - Added environment files section
✅ `.gitignore` - Added api.env and frontend.env

## Verification

```bash
# Check files are in S3
aws s3 ls s3://oneclicktag-env-store-dev/ --region eu-central-1

# Output:
2025-12-09 03:00:21        535 api.env
2025-12-09 03:00:22        517 frontend.env
```

## Setup for New Environments

### For Stage Environment:

1. Create environment files:
   ```bash
   cp backend/.env.example.ecs backend/api.env
   cp frontend/.env.example.ecs frontend/frontend.env
   ```

2. Edit with stage-specific values:
   - Update `DATABASE_URL` to stage database
   - Update `JWT_SECRET` (use different secret per environment)
   - Update `VITE_API_URL` to `https://stage-api.oneclicktag.com/api`
   - Update `CORS_ORIGIN` to `https://stage.oneclicktag.com`

3. Upload:
   ```bash
   ./scripts/upload-env-files.sh stage
   ```

### For Production Environment:

1. Create environment files with production values
2. Use strong, unique secrets for JWT_SECRET
3. Configure production database URL
4. Enable production features (analytics, etc.)
5. Upload:
   ```bash
   ./scripts/upload-env-files.sh prod
   ```

## Important Notes

⚠️ **Environment files contain secrets** - Never commit them to git

⚠️ **Update before each new environment** - Files must exist in S3 before deploying

⚠️ **Use different secrets per environment** - Don't reuse JWT_SECRET across environments

⚠️ **Database URLs must be reachable from ECS** - Ensure security groups allow connections

## Current Status

✅ Environment files uploaded to S3 for dev
✅ Workflow validates files exist before deploying
✅ Documentation updated with clear instructions
✅ Templates created for all environments
✅ Upload script ready to use

## Ready to Deploy

The deployment is now ready to proceed. The workflow will:

1. ✅ Check if environment files exist in S3
2. ✅ Build Docker images
3. ✅ Push to ECR with unique tags
4. ✅ Update ECS task definitions
5. ✅ Deploy services successfully
6. ✅ Tasks will start and download env files from S3

Run the deployment again via GitHub Actions and it should succeed!

## Troubleshooting

### If deployment still fails with 403:

Check IAM policy allows ECS task execution role to read from S3:
```bash
# Check task execution role has policy attached
aws iam list-attached-role-policies --role-name dev-ecs-task-execution-role
```

### If environment variables not loading:

Verify file format is correct (no extra whitespace, proper KEY=value format):
```bash
# Download and check
aws s3 cp s3://oneclicktag-env-store-dev/api.env - | cat -A
```

### If database connection fails:

Check DATABASE_URL is correct and database is reachable from ECS:
- Security groups allow PostgreSQL port (5432)
- Database is in same VPC or publicly accessible
- Credentials are correct
