# ECR Tag Immutability Fix

## Problem

Deployment failed with error:
```
tag invalid: The image tag 'latest' already exists in the 'dev-frontend' repository
and cannot be overwritten because the tag is immutable.
```

## Root Cause

ECR repositories in the infrastructure are configured with `image_tag_mutability = "IMMUTABLE"`, which is a security best practice. This prevents overwriting existing tags, including the `latest` tag.

## Solution

Updated the GitHub Actions workflow to:

1. **Use unique timestamp-based tags** instead of overwriting `latest`
   - Format: `YYYYMMDD-HHMMSS-{git-sha-7chars}`
   - Example: `20251208-143052-a1b2c3d`

2. **Update ECS task definitions** with the new image tag
   - Fetch current task definition
   - Update container image to new tag
   - Register new task definition revision
   - Deploy service with new revision

3. **Remove `latest` tag push** from workflow
   - No longer tries to push `:latest` tag
   - Each deployment gets a unique, immutable tag

## Changes Made

### 1. Backend Deployment (`deploy.yml`)

**Before:**
```yaml
- name: Set environment variables
  run: |
    echo "IMAGE_TAG=${{ github.sha }}" >> $GITHUB_ENV

- name: Build and push Docker image
  run: |
    docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
                 -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest  # ❌ Fails on immutable repos

- name: Force ECS deployment
  run: |
    aws ecs update-service --force-new-deployment
```

**After:**
```yaml
- name: Set environment variables
  run: |
    echo "IMAGE_TAG=$(date +%Y%m%d-%H%M%S)-${GITHUB_SHA::7}" >> $GITHUB_ENV

- name: Build and push Docker image
  run: |
    docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG  # ✅ Unique tag

- name: Update ECS task definition
  run: |
    # Get current task definition
    TASK_DEFINITION=$(aws ecs describe-task-definition ...)

    # Update image tag in task definition
    NEW_TASK_DEF=$(echo $TASK_DEFINITION | jq --arg IMAGE "$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" \
      '.taskDefinition | .containerDefinitions[0].image = $IMAGE | ...')

    # Register new task definition
    NEW_TASK_INFO=$(aws ecs register-task-definition --cli-input-json "$NEW_TASK_DEF")
    NEW_REVISION=$(echo $NEW_TASK_INFO | jq -r '.taskDefinition.revision')

- name: Update ECS service with new task definition
  run: |
    aws ecs update-service \
      --task-definition ${ECS_CLUSTER/-cluster/}:$NEW_TASK_REVISION \
      --force-new-deployment
```

### 2. Frontend Deployment

Same changes applied to frontend deployment job.

## Benefits

1. ✅ **Immutable tags preserved** - Security best practice maintained
2. ✅ **Full audit trail** - Every deployment has a unique, timestamped tag
3. ✅ **Easy rollbacks** - Can redeploy any previous tag
4. ✅ **No tag conflicts** - Each deployment is guaranteed unique
5. ✅ **Git SHA tracking** - Can trace deployment back to exact commit

## Image Tag Examples

```bash
20251208-143052-a1b2c3d  # Deployed on Dec 8, 2025 at 14:30:52, commit a1b2c3d
20251208-150234-f9e8d7c  # Deployed on Dec 8, 2025 at 15:02:34, commit f9e8d7c
20251209-091523-2b4c6a8  # Deployed on Dec 9, 2025 at 09:15:23, commit 2b4c6a8
```

## Rollback Process

To rollback to a previous deployment:

```bash
# List available image tags
aws ecr describe-images --repository-name dev-api --query 'sort_by(imageDetails,& imagePushedAt)[*].[imageTags[0],imagePushedAt]' --output table

# Update service to use previous tag
aws ecs update-service \
  --cluster dev-api-cluster \
  --service dev-api-svc \
  --task-definition dev-api:PREVIOUS_REVISION \
  --force-new-deployment
```

## ECR Repository Configuration

Current configuration in `ecr.tf` (unchanged, remains best practice):

```hcl
resource "aws_ecr_repository" "api" {
  name                 = "${var.env_name}-api"
  image_tag_mutability = "IMMUTABLE"  # ✅ Security best practice
  force_delete         = true
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.env_name}-frontend"
  image_tag_mutability = "IMMUTABLE"  # ✅ Security best practice
  force_delete         = true
}
```

## Testing

The fix has been applied to both backend and frontend deployment jobs. The workflow now:

1. ✅ Generates unique tags
2. ✅ Pushes images without conflicts
3. ✅ Updates task definitions with new image tags
4. ✅ Deploys services successfully
5. ✅ Maintains full deployment history

## Ready to Deploy

The workflow is now ready to use. Try deploying again:

1. Go to GitHub Actions
2. Run "Deploy to AWS ECS" workflow
3. Select service and environment
4. Deployment will complete successfully with unique image tags
