# OneClickTag Scripts

Utility scripts for managing the OneClickTag application.

## Firebase Secrets Upload

Upload Firebase service account credentials to AWS Secrets Manager.

### Prerequisites

1. **Terraform Applied**: The infrastructure must be created first in the `oneclicktag-infra` repo
2. **AWS CLI Configured**: Run `aws configure` with your credentials
3. **Node.js Dependencies**: Run `pnpm install` in project root

### Usage

From project root:

```bash
# Install dependencies (first time only)
pnpm install

# Upload to DEV
npm run upload-firebase-secret:dev

# Upload to STAGE
npm run upload-firebase-secret:stage

# Upload to PROD
npm run upload-firebase-secret:prod
```

### What It Does

1. Reads Firebase JSON from `backend/one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json`
2. Validates the JSON structure and required fields
3. Uploads to two AWS Secrets Manager secrets:
   - `oneclicktag/{env}/firebase-service-account` (full JSON)
   - `oneclicktag/{env}/firebase-project-id` (project ID only)
4. Provides clear success/error messages

### Expected Output

```
================================================
  Firebase Secret Upload to AWS Secrets Manager
================================================

Environment:     dev
Region:          eu-central-1
Firebase JSON:   /Users/orharazi/OneClickTag/backend/one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json
Project ID:      one-click-tag-5fade
Client Email:    firebase-adminsdk-xxxxx@one-click-tag-5fade.iam.gserviceaccount.com

Uploading secrets...

📝 Updating existing secret: oneclicktag/dev/firebase-service-account
✅ Secret updated successfully: oneclicktag/dev/firebase-service-account
📝 Updating existing secret: oneclicktag/dev/firebase-project-id
✅ Secret updated successfully: oneclicktag/dev/firebase-project-id

================================================
✅ All secrets uploaded successfully!
================================================

Next steps:
1. Restart your ECS service to pick up the new secrets:

   aws ecs update-service \
     --cluster dev-api-cluster \
     --service dev-api-svc \
     --force-new-deployment \
     --region eu-central-1

2. Check container logs for successful Firebase initialization:

   aws logs tail /ecs/dev-api --follow --region eu-central-1

   Look for: "Firebase initialized successfully"
```

### Troubleshooting

#### Error: "Secret not found"

**Cause**: Terraform hasn't been applied yet

**Fix**: Apply Terraform in the infra repo first:
```bash
cd ../oneclicktag-infra
terraform apply -var="env_name=dev" -var="aws_region=eu-central-1"
```

#### Error: "Firebase JSON file not found"

**Cause**: Firebase JSON file is missing or in wrong location

**Fix**: Ensure file exists at `backend/one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json`

#### Error: "Access denied"

**Cause**: AWS credentials don't have permission to update secrets

**Fix**: Ensure your AWS user/role has:
- `secretsmanager:PutSecretValue`
- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`

#### Error: "UnrecognizedClientException"

**Cause**: AWS CLI not configured

**Fix**:
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (eu-central-1)
```

## Manual Script Execution

You can also run the script directly:

```bash
node scripts/upload-firebase-secret.js dev
node scripts/upload-firebase-secret.js stage
node scripts/upload-firebase-secret.js prod
```
