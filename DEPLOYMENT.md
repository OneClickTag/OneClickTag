# OneClickTag Deployment Guide

## Overview

This repository is configured for automated deployment to AWS ECS using GitHub Actions.

## Files Created

### Dockerfiles
- **`backend/Dockerfile`** - Multi-stage NestJS backend with Prisma
- **`frontend/Dockerfile`** - Multi-stage Vite frontend with nginx
- **`frontend/nginx.conf`** - nginx configuration for SPA routing

### GitHub Actions
- **`.github/workflows/deploy.yml`** - Manual deployment workflow

## Prerequisites

### 1. GitHub Secrets

Add these secrets to your GitHub repository (`Settings` → `Secrets and variables` → `Actions`):

```
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
```

### 2. AWS Infrastructure

Ensure your infrastructure is deployed from the `oneclicktag-infra` repository:
- ECR repositories created
- ECS clusters and services running
- Load balancers configured
- S3 buckets for environment files created

### 3. Environment Files (⚠️ REQUIRED BEFORE FIRST DEPLOYMENT)

**IMPORTANT**: You MUST upload environment files to S3 before deploying, or ECS tasks will fail to start with "403 Forbidden" errors.

#### Quick Setup

1. **Create environment files from templates**:
   ```bash
   # Backend
   cp backend/.env.example.ecs backend/api.env
   # Edit backend/api.env with your actual values (DATABASE_URL, JWT_SECRET, etc.)

   # Frontend
   cp frontend/.env.example.ecs frontend/frontend.env
   # Edit frontend/frontend.env with your actual values (VITE_API_URL, etc.)
   ```

2. **Upload to S3**:
   ```bash
   # For dev environment
   ./scripts/upload-env-files.sh dev

   # For stage/prod (when ready)
   ./scripts/upload-env-files.sh stage
   ./scripts/upload-env-files.sh prod
   ```

3. **Verify upload**:
   ```bash
   aws s3 ls s3://oneclicktag-env-store-dev/ --region eu-central-1
   ```

#### Required Environment Variables

**Backend** (`backend/api.env`):
- `DATABASE_URL` - PostgreSQL connection string (REQUIRED)
- `JWT_SECRET` - Secret for JWT tokens (REQUIRED)
- `CORS_ORIGIN` - Frontend URL for CORS
- See `backend/.env.example.ecs` for all options

**Frontend** (`frontend/frontend.env`):
- `VITE_API_URL` - Backend API URL (REQUIRED)
- See `frontend/.env.example.ecs` for all options

## Deployment

### GitHub Actions (Recommended)

1. Go to **Actions** tab in GitHub
2. Select **Deploy to AWS ECS** workflow
3. Click **Run workflow**
4. Select options:
   - **Service**: `backend`, `frontend`, or `both`
   - **Environment**: `dev`, `stage`, or `prod`
5. Click **Run workflow**

The workflow will:
1. Build Docker image(s)
2. Push to ECR with unique timestamp tag (format: `YYYYMMDD-HHMMSS-{git-sha}`)
3. Update ECS task definition with new image tag
4. Deploy updated task definition to ECS service
5. Wait for deployment to stabilize
6. Show deployment summary

**Note**: ECR repositories use immutable tags for security. Each deployment creates a unique tag.

### Manual Deployment

#### Build and Test Locally

```bash
# Test backend build
docker build -t test-backend -f backend/Dockerfile .

# Test frontend build
docker build -t test-frontend -f frontend/Dockerfile .
```

#### Deploy Manually

```bash
# Set environment and create unique tag
ENV=dev  # or stage, prod
IMAGE_TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)

# Get ECR credentials
aws ecr get-login-password --region eu-central-1 | \
  docker login --username AWS --password-stdin 652617421418.dkr.ecr.eu-central-1.amazonaws.com

# Build and push backend
docker build -t 652617421418.dkr.ecr.eu-central-1.amazonaws.com/${ENV}-api:$IMAGE_TAG -f backend/Dockerfile .
docker push 652617421418.dkr.ecr.eu-central-1.amazonaws.com/${ENV}-api:$IMAGE_TAG

# Build and push frontend
docker build -t 652617421418.dkr.ecr.eu-central-1.amazonaws.com/${ENV}-frontend:$IMAGE_TAG -f frontend/Dockerfile .
docker push 652617421418.dkr.ecr.eu-central-1.amazonaws.com/${ENV}-frontend:$IMAGE_TAG

# Update task definitions with new image tags
# (You'll need to update the task definitions to use the new image tag, then update the service)
aws ecs update-service --cluster ${ENV}-api-cluster --service ${ENV}-api-svc --force-new-deployment
aws ecs update-service --cluster ${ENV}-frontend-cluster --service ${ENV}-frontend-svc --force-new-deployment
```

## Docker Image Details

### Backend Image
- Base: `node:18-alpine`
- Build dependencies: Python3, make, g++, openssl-dev
- Build order: shared package → Prisma generate → backend build
- Includes: Prisma, NestJS, bcrypt (native module)
- Entry point: Runs migrations then starts server
- Port: 80

### Frontend Image
- Base: `node:18-alpine` (builder), `nginx:alpine` (runtime)
- Build order: shared package → Vite build
- Build: Vite production build (TypeScript checking skipped in Docker)
- Runtime: nginx with SPA routing, gzip, security headers
- Port: 80

## Environment Variables

Environment variables are loaded from S3 buckets configured in the infrastructure:

- **Backend**: `s3://oneclicktag-env-store-{env}/api.env`
- **Frontend**: `s3://oneclicktag-env-store-{env}/frontend.env`

Upload environment files using:
```bash
cd ../oneclicktag-infra
./scripts/deploy-config.sh dev
```

## Monitoring

### View Logs
```bash
# Backend logs
aws logs tail /ecs/{env}/api --follow

# Frontend logs
aws logs tail /ecs/{env}/frontend --follow
```

### Check Service Status
```bash
ENV=dev
aws ecs describe-services --cluster ${ENV}-api-cluster --services ${ENV}-api-svc
aws ecs list-tasks --cluster ${ENV}-api-cluster --service-name ${ENV}-api-svc
```

## Troubleshooting

### Build Failures

**Backend fails on bcrypt compilation:**
- Ensure Python3, make, g++ are installed in Dockerfile
- Check: `RUN apk add --no-cache python3 py3-setuptools make g++ openssl-dev`

**Frontend TypeScript errors:**
- TypeScript checking is skipped during Docker build (`pnpm vite build`)
- Run type checking separately: `pnpm build` (includes `tsc`)

### Deployment Failures

**Image not found:**
```bash
# Verify image exists in ECR
aws ecr describe-images --repository-name dev-api
```

**Service won't stabilize:**
```bash
# Check service events
aws ecs describe-services --cluster dev-api-cluster --services dev-api-svc

# Check task logs
aws logs tail /ecs/dev/api --follow
```

**Database connection errors:**
- Ensure Prisma migrations ran: Check container logs for "prisma migrate deploy"
- Verify DATABASE_URL in S3 environment file

## URLs

After deployment, services are available at:

- **Dev Frontend**: https://dev.oneclicktag.com
- **Dev API**: https://dev-api.oneclicktag.com
- **Stage Frontend**: https://stage.oneclicktag.com
- **Stage API**: https://stage-api.oneclicktag.com
- **Prod Frontend**: https://oneclicktag.com
- **Prod API**: https://api.oneclicktag.com

## Notes

- **TypeScript checking**: Done in CI before Docker build, not during build
- **Prisma**: Generates client in both builder and production stages
- **Migrations**: Run automatically on container start via CMD
- **Image tags**: Unique timestamp-based tags (format: `YYYYMMDD-HHMMSS-{git-sha}`)
- **Tag immutability**: ECR repositories use immutable tags for security
- **Workspace**: Monorepo structure requires copying workspace files
- **Task definitions**: Automatically updated with new image tags during deployment
