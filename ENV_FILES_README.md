# Environment Files Guide

## Overview

Environment files are stored in S3 and loaded by ECS tasks at runtime. Each environment (dev/stage/prod) has its own S3 bucket with separate configuration files.

## File Structure

```
backend/
  ├── .env.example.ecs      # Template with all available variables
  ├── api.env.dev          # Dev environment configuration
  ├── api.env.stage        # Stage environment configuration
  ├── api.env.prod         # Production environment configuration
  └── api.env              # Working copy (currently points to dev)

frontend/
  ├── .env.example.ecs      # Template with all available variables
  ├── frontend.env.dev     # Dev environment configuration
  ├── frontend.env.stage   # Stage environment configuration
  ├── frontend.env.prod    # Production environment configuration
  └── frontend.env         # Working copy (currently points to dev)
```

## S3 Buckets

| Environment | Backend | Frontend |
|-------------|---------|----------|
| **Dev** | `s3://oneclicktag-env-store-dev/api.env` | `s3://oneclicktag-env-store-dev/frontend.env` |
| **Stage** | `s3://oneclicktag-env-store-stage/api.env` | `s3://oneclicktag-env-store-stage/frontend.env` |
| **Prod** | `s3://oneclicktag-env-store-prod/api.env` | `s3://oneclicktag-env-store-prod/frontend.env` |

## Current Status

✅ All environment files created and uploaded to S3:

```bash
# Verify uploads
aws s3 ls s3://oneclicktag-env-store-dev/ --region eu-central-1
aws s3 ls s3://oneclicktag-env-store-stage/ --region eu-central-1
aws s3 ls s3://oneclicktag-env-store-prod/ --region eu-central-1
```

## Environment-Specific Configurations

### Dev Environment
- **API URL**: `https://dev-api.oneclicktag.com/api`
- **Frontend URL**: `https://dev.oneclicktag.com`
- **Database**: `oneclicktag_dev`
- **Debug**: Enabled
- **Analytics**: Disabled

### Stage Environment
- **API URL**: `https://stage-api.oneclicktag.com/api`
- **Frontend URL**: `https://stage.oneclicktag.com`
- **Database**: `oneclicktag_stage`
- **Debug**: Enabled
- **Analytics**: Disabled

### Production Environment
- **API URL**: `https://api.oneclicktag.com/api`
- **Frontend URL**: `https://oneclicktag.com`
- **Database**: `oneclicktag_prod`
- **Debug**: Disabled
- **Analytics**: Enabled

## Updating Environment Files

### Option 1: Update Specific Environment

```bash
# 1. Edit the environment-specific file
nano backend/api.env.stage

# 2. Copy to working file
cp backend/api.env.stage backend/api.env
cp frontend/frontend.env.stage frontend/frontend.env

# 3. Upload
./scripts/upload-env-files.sh stage
```

### Option 2: Quick Update (if api.env/frontend.env already point to correct env)

```bash
# Edit working files directly
nano backend/api.env
nano frontend/frontend.env

# Upload to specific environment
./scripts/upload-env-files.sh dev
```

## Required Updates Before Deployment

⚠️ **These placeholder values MUST be updated before deploying:**

### Backend (api.env)

1. **DATABASE_URL** - Update with your actual PostgreSQL connection string
   ```
   # Current placeholder:
   DATABASE_URL=postgresql://user:password@localhost:5432/oneclicktag_dev?schema=public

   # Should be:
   DATABASE_URL=postgresql://actual_user:actual_pass@your-rds-endpoint:5432/oneclicktag_dev?schema=public
   ```

2. **JWT_SECRET** - Change to strong random value (different for each environment)
   ```bash
   # Generate strong secrets:
   openssl rand -base64 32
   ```

3. **CORS_ORIGIN** - Already correct, but verify:
   - Dev: `https://dev.oneclicktag.com`
   - Stage: `https://stage.oneclicktag.com`
   - Prod: `https://oneclicktag.com`

### Frontend (frontend.env)

1. **VITE_API_URL** - Already correct:
   - Dev: `https://dev-api.oneclicktag.com/api`
   - Stage: `https://stage-api.oneclicktag.com/api`
   - Prod: `https://api.oneclicktag.com/api`

2. **Optional services** - Add if you use Firebase/Google OAuth:
   - VITE_FIREBASE_API_KEY
   - VITE_GOOGLE_CLIENT_ID

## Security Best Practices

✅ **DO**:
- Use different `JWT_SECRET` for each environment
- Use strong, random secrets (32+ characters)
- Update `DATABASE_URL` to point to actual database
- Review and update all placeholder values
- Keep environment files in `.gitignore`

❌ **DON'T**:
- Commit environment files to git
- Use the same secrets across environments
- Leave placeholder values in production
- Share production credentials

## Verification

After updating and uploading, verify the files are correct:

```bash
# Download and review (won't show sensitive data in terminal)
aws s3 cp s3://oneclicktag-env-store-dev/api.env - | head -5

# Check file size (should be similar to what you uploaded)
aws s3 ls s3://oneclicktag-env-store-dev/
```

## Troubleshooting

### If deployment fails with "403 Forbidden":

1. Check files exist in S3:
   ```bash
   aws s3 ls s3://oneclicktag-env-store-dev/
   ```

2. Verify IAM permissions:
   ```bash
   aws iam list-attached-role-policies --role-name dev-ecs-task-execution-role
   ```

3. Check file format (no extra whitespace, proper KEY=value):
   ```bash
   aws s3 cp s3://oneclicktag-env-store-dev/api.env - | cat -A
   ```

### If database connection fails:

1. Verify `DATABASE_URL` is correct
2. Check security groups allow PostgreSQL (port 5432) from ECS
3. Test connection from ECS subnet
4. Verify database credentials

## Quick Reference

```bash
# Upload all environments at once
for env in dev stage prod; do
  cp backend/api.env.$env backend/api.env
  cp frontend/frontend.env.$env frontend/frontend.env
  ./scripts/upload-env-files.sh $env
done

# Restore dev as default
cp backend/api.env.dev backend/api.env
cp frontend/frontend.env.dev frontend/frontend.env

# View uploaded files
aws s3 ls s3://oneclicktag-env-store-dev/
aws s3 ls s3://oneclicktag-env-store-stage/
aws s3 ls s3://oneclicktag-env-store-prod/
```
