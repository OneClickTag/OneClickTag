#!/bin/bash
# Database Connection Info Script
# Outputs all details needed for DBeaver SSH tunnel connection

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV="${1:-dev}"
REGION="${AWS_REGION:-eu-central-1}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  OneClickTag Database Connection Info${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "${ENV}-oneclicktag-db" \
    --region "$REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

RDS_PORT=$(aws rds describe-db-instances \
    --db-instance-identifier "${ENV}-oneclicktag-db" \
    --region "$REGION" \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text)

# Get database password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id "${ENV}-oneclicktag-db-password" \
    --region "$REGION" \
    --query 'SecretString' \
    --output text)

DB_NAME="oneclicktag"
DB_USER="oneclicktag"

# Get ECS task info for SSH tunnel
TASK_ARN=$(aws ecs list-tasks \
    --cluster "${ENV}-api-cluster" \
    --service-name "${ENV}-api-svc" \
    --region "$REGION" \
    --desired-status RUNNING \
    --query 'taskArns[0]' \
    --output text)

TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')

# Get task public IP
TASK_ENI=$(aws ecs describe-tasks \
    --cluster "${ENV}-api-cluster" \
    --tasks "$TASK_ID" \
    --region "$REGION" \
    --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
    --output text)

TASK_PUBLIC_IP=$(aws ec2 describe-network-interfaces \
    --network-interface-ids "$TASK_ENI" \
    --region "$REGION" \
    --query 'NetworkInterfaces[0].Association.PublicIp' \
    --output text 2>/dev/null || echo "N/A")

echo -e "${GREEN}📊 DATABASE CONNECTION DETAILS${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}RDS Endpoint:${NC}    $RDS_ENDPOINT"
echo -e "${YELLOW}RDS Port:${NC}        $RDS_PORT"
echo -e "${YELLOW}Database Name:${NC}   $DB_NAME"
echo -e "${YELLOW}Username:${NC}        $DB_USER"
echo -e "${YELLOW}Password:${NC}        $DB_PASSWORD"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🔐 DBEAVER SSH TUNNEL SETTINGS${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  SSH TUNNEL NOT AVAILABLE${NC}"
echo -e "Fargate ECS doesn't support traditional SSH tunneling."
echo ""
echo -e "${YELLOW}OPTION 1: Use SSM Port Forwarding (if working)${NC}"
echo -e "Run: ${GREEN}npm run db:tunnel:dev${NC}"
echo -e "Then connect to:"
echo -e "  Host: ${GREEN}localhost${NC}"
echo -e "  Port: ${GREEN}5433${NC}"
echo -e "  Database: ${GREEN}$DB_NAME${NC}"
echo -e "  Username: ${GREEN}$DB_USER${NC}"
echo -e "  Password: ${GREEN}$DB_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}OPTION 2: Direct RDS Connection (requires security group rule)${NC}"
echo -e "  Host: ${GREEN}$RDS_ENDPOINT${NC}"
echo -e "  Port: ${GREEN}$RDS_PORT${NC}"
echo -e "  Database: ${GREEN}$DB_NAME${NC}"
echo -e "  Username: ${GREEN}$DB_USER${NC}"
echo -e "  Password: ${GREEN}$DB_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}OPTION 3: Deploy EC2 Bastion Host${NC}"
echo -e "Add to Terraform:"
echo -e '  resource "aws_instance" "bastion" {'
echo -e '    ami           = "ami-xxxxxx"  # Amazon Linux 2'
echo -e '    instance_type = "t3.micro"'
echo -e '    key_name      = "your-key"'
echo -e '    subnet_id     = aws_subnet.public[0].id'
echo -e '    vpc_security_group_ids = [aws_security_group.bastion_sg.id]'
echo -e '  }'
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}📋 CONNECTION STRING${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "postgresql://${DB_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🔍 ECS TASK INFO${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Task ID:${NC}         $TASK_ID"
echo -e "${YELLOW}Task Public IP:${NC}  $TASK_PUBLIC_IP"
echo -e "${YELLOW}Cluster:${NC}         ${ENV}-api-cluster"
echo ""
