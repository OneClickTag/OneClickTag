#!/bin/bash

# Start Jump Box EC2 Instance
# Usage: ./jumpbox-start.sh [dev|stage|prod]

set -e

ENV=${1:-dev}

echo "🚀 Starting jump box for $ENV environment..."

# Get instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --region eu-central-1 \
  --filters "Name=tag:Name,Values=${ENV}-jumpbox" "Name=instance-state-name,Values=stopped,running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

if [ "$INSTANCE_ID" == "None" ] || [ -z "$INSTANCE_ID" ]; then
  echo "❌ Jump box not found for $ENV environment"
  echo "   Run 'terraform apply' in oneclicktag-infra to create it"
  exit 1
fi

# Check current state
STATE=$(aws ec2 describe-instances \
  --region eu-central-1 \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

if [ "$STATE" == "running" ]; then
  echo "✅ Jump box is already running"
else
  echo "⏳ Starting instance $INSTANCE_ID..."
  aws ec2 start-instances --instance-ids $INSTANCE_ID --region eu-central-1 > /dev/null

  echo "⏳ Waiting for instance to be running..."
  aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region eu-central-1

  echo "⏳ Waiting for status checks (30 seconds)..."
  sleep 30

  echo "✅ Jump box started successfully!"
fi

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --region eu-central-1 \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --region eu-central-1 \
  --db-instance-identifier ${ENV}-oneclicktag-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo ""
echo "================================================"
echo "📊 Jump Box Connection Info"
echo "================================================"
echo ""
echo "Public IP:     $PUBLIC_IP"
echo "Instance ID:   $INSTANCE_ID"
echo ""
echo "🔐 SSH Command:"
echo "ssh -i ~/.ssh/id_ed25519 ec2-user@${PUBLIC_IP}"
echo ""
echo "🔗 SSH Tunnel for DBeaver (run in separate terminal):"
echo "ssh -i ~/.ssh/id_ed25519 -L 5433:${RDS_ENDPOINT}:5432 ec2-user@${PUBLIC_IP} -N"
echo ""
echo "📊 DBeaver Connection (after tunnel is running):"
echo "Host:          localhost"
echo "Port:          5433"
echo "Database:      oneclicktag"
echo "Username:      oneclicktag"
echo "Password:      [Get from AWS Secrets Manager]"
echo "SSH:           DISABLED (using local tunnel instead)"
echo ""
echo "================================================"
echo "💡 Remember to stop the jump box when done:"
echo "   npm run jumpbox:stop:$ENV"
echo "================================================"
