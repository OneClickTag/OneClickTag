#!/bin/bash
# Database Tunnel Script for OneClickTag
# Opens an SSH tunnel to RDS via ECS Task using AWS Systems Manager

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse environment argument
ENV="${1:-dev}"

# Validate environment
if [[ ! "$ENV" =~ ^(dev|stage|prod)$ ]]; then
    echo -e "${RED}❌ Error: Invalid environment '$ENV'${NC}"
    echo "Usage: npm run db:tunnel:dev|stage|prod"
    exit 1
fi

REGION="${AWS_REGION:-eu-central-1}"
CLUSTER_NAME="${ENV}-api-cluster"
SERVICE_NAME="${ENV}-api-svc"
CONTAINER_NAME="${ENV}-api-container"
LOCAL_PORT="${DB_TUNNEL_PORT:-5433}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  OneClickTag Database Tunnel${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Environment:${NC} $ENV"
echo -e "${YELLOW}Region:${NC}      $REGION"
echo -e "${YELLOW}Local Port:${NC}  $LOCAL_PORT"
echo ""

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ Error: AWS CLI is not installed${NC}"
    echo "Install: brew install awscli"
    exit 1
fi
echo -e "${GREEN}✅ AWS CLI installed${NC}"

# Check Session Manager plugin
if ! command -v session-manager-plugin &> /dev/null; then
    echo -e "${RED}❌ Error: AWS Session Manager plugin is not installed${NC}"
    echo "Install: brew install --cask session-manager-plugin"
    echo "Or visit: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
    exit 1
fi
echo -e "${GREEN}✅ Session Manager plugin installed${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi
echo -e "${GREEN}✅ AWS credentials configured${NC}"
echo ""

# Get RDS endpoint
echo -e "${BLUE}🔍 Getting database connection details...${NC}"

RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "${ENV}-oneclicktag-db" \
    --region "$REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text 2>/dev/null)

if [ -z "$RDS_ENDPOINT" ] || [ "$RDS_ENDPOINT" == "None" ]; then
    echo -e "${RED}❌ Error: Could not find RDS instance '${ENV}-oneclicktag-db'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ RDS Endpoint:${NC} $RDS_ENDPOINT"

# Get database credentials from Secrets Manager
DB_SECRET_NAME="${ENV}-oneclicktag-db-password"
DB_PASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id "$DB_SECRET_NAME" \
    --region "$REGION" \
    --query 'SecretString' \
    --output text 2>/dev/null)

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Warning: Could not retrieve database password from Secrets Manager${NC}"
    DB_PASSWORD="<password-from-terraform-output>"
fi

DB_NAME="oneclicktag"
DB_USER="oneclicktag"

echo ""

# Get ECS task ID
echo -e "${BLUE}🔍 Finding running ECS task...${NC}"

TASK_ARN=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --region "$REGION" \
    --desired-status RUNNING \
    --query 'taskArns[0]' \
    --output text 2>/dev/null)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
    echo -e "${RED}❌ Error: No running tasks found in cluster '$CLUSTER_NAME' service '$SERVICE_NAME'${NC}"
    echo "Make sure your ECS service is running"
    exit 1
fi

TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')
echo -e "${GREEN}✅ Found task:${NC} $TASK_ID"
echo ""

# Check if port is already in use
if lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Warning: Port $LOCAL_PORT is already in use${NC}"
    echo "Kill the existing process or use a different port:"
    echo "  DB_TUNNEL_PORT=5434 npm run db:tunnel:$ENV"
    echo ""
    read -p "Kill existing process and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:$LOCAL_PORT | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        exit 1
    fi
fi

# Start port forwarding
echo -e "${GREEN}🚀 Starting database tunnel...${NC}"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  📊 DBeaver Connection Settings${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Connection Type:${NC} PostgreSQL"
echo -e "${YELLOW}Host:${NC}            localhost"
echo -e "${YELLOW}Port:${NC}            $LOCAL_PORT"
echo -e "${YELLOW}Database:${NC}        $DB_NAME"
echo -e "${YELLOW}Username:${NC}        $DB_USER"
echo -e "${YELLOW}Password:${NC}        $DB_PASSWORD"
echo -e "${YELLOW}SSL:${NC}             Disabled"
echo ""
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}✅ Tunnel is now active!${NC}"
echo -e "${YELLOW}⚠️  Keep this terminal open${NC}"
echo -e "${RED}Press Ctrl+C to stop the tunnel${NC}"
echo ""

# Start the SSM session
aws ssm start-session \
    --target "ecs:${CLUSTER_NAME}_${TASK_ID}_${CONTAINER_NAME}" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"${RDS_ENDPOINT}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}" \
    --region "$REGION"

echo ""
echo -e "${YELLOW}Tunnel closed.${NC}"
