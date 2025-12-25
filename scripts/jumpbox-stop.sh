#!/bin/bash

# Stop Jump Box EC2 Instance
# Usage: ./jumpbox-stop.sh [dev|stage|prod]

set -e

ENV=${1:-dev}

echo "🛑 Stopping jump box for $ENV environment..."

# Get instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --region eu-central-1 \
  --filters "Name=tag:Name,Values=${ENV}-jumpbox" "Name=instance-state-name,Values=running,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

if [ "$INSTANCE_ID" == "None" ] || [ -z "$INSTANCE_ID" ]; then
  echo "❌ Jump box not found for $ENV environment"
  exit 1
fi

# Check current state
STATE=$(aws ec2 describe-instances \
  --region eu-central-1 \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

if [ "$STATE" == "stopped" ]; then
  echo "✅ Jump box is already stopped"
  exit 0
fi

echo "⏳ Stopping instance $INSTANCE_ID..."
aws ec2 stop-instances --instance-ids $INSTANCE_ID --region eu-central-1 > /dev/null

echo "⏳ Waiting for instance to stop..."
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID --region eu-central-1

echo "✅ Jump box stopped successfully!"
echo ""
echo "💰 Cost savings: Jump box is now stopped and not incurring charges"
echo "   Start it again with: npm run jumpbox:start:$ENV"
