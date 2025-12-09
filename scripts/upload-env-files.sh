#!/bin/bash

# Upload environment files to S3 for ECS deployment
# Usage: ./scripts/upload-env-files.sh <environment>
# Example: ./scripts/upload-env-files.sh dev

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Environment not specified"
  echo "Usage: $0 <environment>"
  echo "Example: $0 dev"
  exit 1
fi

ENV=$1
BUCKET="oneclicktag-env-store-${ENV}"
REGION="eu-central-1"

echo "📦 Uploading environment files to S3 bucket: ${BUCKET}"
echo ""

# Check if bucket exists
if ! aws s3 ls "s3://${BUCKET}" --region ${REGION} 2>&1 > /dev/null; then
  echo "❌ Error: S3 bucket '${BUCKET}' does not exist"
  echo "Make sure the infrastructure is deployed first"
  exit 1
fi

# Backend env file
if [ -f "backend/api.env" ]; then
  echo "📤 Uploading backend/api.env..."
  aws s3 cp backend/api.env s3://${BUCKET}/api.env --region ${REGION}
  echo "✅ Backend environment file uploaded"
else
  echo "⚠️  Warning: backend/api.env not found"
  echo "   Create it from backend/.env.example.ecs"
fi

echo ""

# Frontend env file
if [ -f "frontend/frontend.env" ]; then
  echo "📤 Uploading frontend/frontend.env..."
  aws s3 cp frontend/frontend.env s3://${BUCKET}/frontend.env --region ${REGION}
  echo "✅ Frontend environment file uploaded"
else
  echo "⚠️  Warning: frontend/frontend.env not found"
  echo "   Create it from frontend/.env.example.ecs"
fi

echo ""
echo "🎉 Done! Verify uploaded files:"
echo "aws s3 ls s3://${BUCKET}/ --region ${REGION}"
