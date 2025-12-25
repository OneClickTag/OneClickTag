# Firebase Credentials Setup with AWS Secrets Manager

This guide explains how to securely store Firebase credentials using AWS Secrets Manager and inject them into ECS containers.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Firebase service account JSON file: `one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json`
- Access to AWS account with permissions to create secrets and update ECS task definitions

---

## Step 1: Upload Firebase Credentials to Secrets Manager

### Recommended: Using Upload Script (Easiest)

The infrastructure has already been set up via Terraform. You just need to upload the Firebase credentials:

```bash
# Navigate to project root
cd /Users/orharazi/OneClickTag

# Install dependencies (first time only)
pnpm install

# Upload to DEV environment
npm run upload-firebase-secret:dev

# Upload to STAGE environment
npm run upload-firebase-secret:stage

# Upload to PROD environment
npm run upload-firebase-secret:prod
```

The script automatically:
- Validates the Firebase JSON file
- Uploads to the correct Secrets Manager secrets
- Provides clear error messages if something is wrong

### Alternative: Manual Upload via AWS CLI

If you prefer to upload manually:

```bash
# Navigate to backend directory where the Firebase JSON file is located
cd /Users/orharazi/OneClickTag/backend

# Upload service account JSON for DEV
aws secretsmanager put-secret-value \
  --secret-id oneclicktag/dev/firebase-service-account \
  --secret-string file://one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json \
  --region eu-central-1

# Upload project ID for DEV
aws secretsmanager put-secret-value \
  --secret-id oneclicktag/dev/firebase-project-id \
  --secret-string "one-click-tag-5fade" \
  --region eu-central-1
```

Repeat for STAGE and PROD by changing `dev` to `stage` or `prod`.

### Option B: Using AWS Console

1. Go to AWS Secrets Manager console: https://console.aws.amazon.com/secretsmanager/
2. Click **"Store a new secret"**
3. Select **"Other type of secret"**
4. Click **"Plaintext"** tab
5. Paste the **entire contents** of `one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json`
6. Click **Next**
7. Secret name: `oneclicktag/dev/firebase-service-account`
8. Description: `Firebase service account for OneClickTag DEV environment`
9. Click **Next** → **Next** → **Store**
10. Repeat for STAGE and PROD environments
11. Create another secret with name `oneclicktag/firebase-project-id` and value `one-click-tag-5fade`

---

## Step 2: Upload Firebase Credentials

**IMPORTANT:** The Terraform infrastructure must be applied first (in the `oneclicktag-infra` repo).

From the project root, run:

```bash
cd /Users/orharazi/OneClickTag

# Install dependencies (first time only)
pnpm install

# Upload credentials
npm run upload-firebase-secret:dev  # or :stage or :prod
```

You should see:
```
✅ Secret updated successfully: oneclicktag/dev/firebase-service-account
✅ Secret updated successfully: oneclicktag/dev/firebase-project-id
✅ All secrets uploaded successfully!
```

## Step 3: Grant ECS Task Role Permissions

Your ECS Task Role needs permission to read these secrets.

### Find Your ECS Task Role ARN
```bash
# List ECS task definitions to find the role
aws ecs describe-task-definition \
  --task-definition oneclicktag-backend-dev \
  --query 'taskDefinition.taskRoleArn' \
  --output text
```

### Create IAM Policy for Secrets Access

Create file `firebase-secrets-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:eu-central-1:*:secret:oneclicktag/*/firebase-service-account-*",
        "arn:aws:secretsmanager:eu-central-1:*:secret:oneclicktag/firebase-project-id-*"
      ]
    }
  ]
}
```

### Attach Policy to Task Role
```bash
# Create the policy
aws iam create-policy \
  --policy-name OneClickTagFirebaseSecretsAccess \
  --policy-document file://firebase-secrets-policy.json

# Attach to your ECS task role (replace with your actual role name)
aws iam attach-role-policy \
  --role-name ecsTaskRole-oneclicktag-backend \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/OneClickTagFirebaseSecretsAccess
```

---

## Step 4: Update ECS Task Definition (Already Done via Terraform)

You need to add a `secrets` section to your ECS task definition to inject the secrets as environment variables.

### For DEV Environment

Add this to your task definition JSON under `containerDefinitions[0]`:

```json
{
  "containerDefinitions": [
    {
      "name": "oneclicktag-backend",
      "image": "...",
      "environment": [
        // ... your existing environment variables
      ],
      "secrets": [
        {
          "name": "FIREBASE_PROJECT_ID",
          "valueFrom": "arn:aws:secretsmanager:eu-central-1:YOUR_ACCOUNT_ID:secret:oneclicktag/firebase-project-id-XXXXXX"
        },
        {
          "name": "FIREBASE_SERVICE_ACCOUNT_KEY",
          "valueFrom": "arn:aws:secretsmanager:eu-central-1:YOUR_ACCOUNT_ID:secret:oneclicktag/dev/firebase-service-account-XXXXXX"
        }
      ]
    }
  ]
}
```

### For STAGE Environment

Same as DEV but use:
```json
"valueFrom": "arn:aws:secretsmanager:eu-central-1:YOUR_ACCOUNT_ID:secret:oneclicktag/stage/firebase-service-account-XXXXXX"
```

### For PROD Environment

Same as DEV but use:
```json
"valueFrom": "arn:aws:secretsmanager:eu-central-1:YOUR_ACCOUNT_ID:secret:oneclicktag/prod/firebase-service-account-XXXXXX"
```

### Update Task Definition via CLI

```bash
# Register new task definition revision with secrets
aws ecs register-task-definition --cli-input-json file://task-definition-dev.json

# Update service to use new task definition
aws ecs update-service \
  --cluster oneclicktag-dev \
  --service oneclicktag-backend-dev \
  --task-definition oneclicktag-backend-dev:NEW_REVISION \
  --force-new-deployment
```

---

## Step 5: Restart ECS Service

After uploading secrets, restart the ECS service:

```bash
aws ecs update-service \
  --cluster dev-api-cluster \
  --service dev-api-svc \
  --force-new-deployment \
  --region eu-central-1
```

## Step 6: Verify Setup

### Check Container Logs

```bash
# Stream logs from CloudWatch
aws logs tail /ecs/oneclicktag-backend-dev --follow

# Look for this message:
# "Firebase initialized successfully"
```

### Test Authentication Endpoint

```bash
# DEV
curl -X POST https://dev-api.oneclicktag.com/api/v1/auth/firebase \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test","tenantId":null}'

# Should return 401 with "Invalid Firebase token" (not "Firebase is not configured")
```

---

## Summary: What Gets Uploaded Where

### AWS Secrets Manager (eu-central-1)

| Secret Name | Value | Used By |
|-------------|-------|---------|
| `oneclicktag/dev/firebase-service-account` | Contents of `one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json` | DEV environment |
| `oneclicktag/stage/firebase-service-account` | Contents of `one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json` | STAGE environment |
| `oneclicktag/prod/firebase-service-account` | Contents of `one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json` | PROD environment |
| `oneclicktag/firebase-project-id` | `one-click-tag-5fade` | All environments |

### Local Files (No Changes Needed)

- `backend/.env` - Already has `FIREBASE_SERVICE_ACCOUNT_KEY` and `FIREBASE_PROJECT_ID` set
- `backend/one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json` - Stays local for development

---

## Security Benefits

✅ **No credentials in code or Dockerfile**
✅ **No credentials in environment files committed to git**
✅ **Encrypted at rest** (AWS KMS)
✅ **Encrypted in transit** (TLS)
✅ **IAM-controlled access**
✅ **Audit trail** (CloudTrail logs who accessed secrets)
✅ **Easy rotation** (update secret, redeploy container)
✅ **No files on disk** (injected as environment variable at runtime)

---

## Troubleshooting

### "Firebase is not configured" Error

**Cause**: Secrets not properly injected into container

**Check**:
1. Task role has `secretsmanager:GetSecretValue` permission
2. Secret ARNs in task definition are correct
3. Secrets exist in the same region as ECS (eu-central-1)
4. Container logs for startup errors

### "Invalid Firebase token" Error (Expected)

This is **normal** if you send a test token. It means Firebase **is** configured and working.

### Task Won't Start

**Check**:
1. CloudWatch logs for the task
2. ECS Events tab for error messages
3. Ensure task role (not execution role) has secrets permissions

---

## Cost

AWS Secrets Manager pricing:
- **$0.40/month per secret**
- **$0.05 per 10,000 API calls**

For 4 secrets (3 environments + project ID):
- **Monthly cost: ~$1.60**
- API calls: Minimal (only on container startup)

**Total estimated cost: ~$2/month**
