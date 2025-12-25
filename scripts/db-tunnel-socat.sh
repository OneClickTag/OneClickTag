#!/bin/bash
# Database Tunnel via ECS Exec with socat
# This works around the SSM port forwarding limitation

set -e

ENV="${1:-dev}"
REGION="${AWS_REGION:-eu-central-1}"
CLUSTER_NAME="${ENV}-api-cluster"
SERVICE_NAME="${ENV}-api-svc"
LOCAL_PORT="${DB_TUNNEL_PORT:-5433}"

echo "🔍 Finding ECS task..."
TASK_ARN=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --region "$REGION" \
    --desired-status RUNNING \
    --query 'taskArns[0]' \
    --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
    echo "❌ No running tasks found"
    exit 1
fi

TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')
echo "✅ Found task: $TASK_ID"

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "${ENV}-oneclicktag-db" \
    --region "$REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo "✅ RDS: $RDS_ENDPOINT"
echo ""
echo "⚠️  Installing socat in container (one-time setup)..."

# Install socat in the container
aws ecs execute-command \
    --cluster "$CLUSTER_NAME" \
    --task "$TASK_ID" \
    --container "${ENV}-api-container" \
    --interactive \
    --command "apk add --no-cache socat || apt-get update && apt-get install -y socat || yum install -y socat" \
    --region "$REGION" 2>&1 | grep -v "SessionId" || true

echo "✅ Starting tunnel on localhost:$LOCAL_PORT"
echo "Press Ctrl+C to stop"
echo ""

# Use AWS CLI to keep the session open with socat forwarding
aws ecs execute-command \
    --cluster "$CLUSTER_NAME" \
    --task "$TASK_ID" \
    --container "${ENV}-api-container" \
    --interactive \
    --command "/bin/sh -c 'socat TCP-LISTEN:15432,reuseaddr,fork TCP:${RDS_ENDPOINT}:5432 & PID=\$!; echo Tunnel ready; trap \"kill \$PID\" EXIT; wait \$PID'" \
    --region "$REGION" &

ECS_PID=$!

# Forward local port to container
sleep 3
echo "Creating local port forward..."
aws ssm start-session \
    --target "ecs:${CLUSTER_NAME}_${TASK_ID}_${ENV}-api-container" \
    --document-name AWS-StartPortForwardingSession \
    --parameters "{\"portNumber\":[\"15432\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}" \
    --region "$REGION"

kill $ECS_PID 2>/dev/null || true
