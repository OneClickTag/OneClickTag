#!/bin/bash
# Temporarily allow your IP to access RDS directly
# Auto-revokes access when script exits

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV="${1:-dev}"
REGION="${AWS_REGION:-eu-central-1}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  RDS Direct Access (Temporary)${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Get your public IP
echo -e "${BLUE}🔍 Getting your public IP...${NC}"
MY_IP=$(curl -s https://checkip.amazonaws.com)

if [ -z "$MY_IP" ]; then
    echo -e "${RED}❌ Failed to get public IP${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Your IP: ${MY_IP}${NC}"
echo ""

# Get RDS security group
echo -e "${BLUE}🔍 Finding RDS security group...${NC}"
RDS_SG=$(aws rds describe-db-instances \
    --db-instance-identifier "${ENV}-oneclicktag-db" \
    --region "$REGION" \
    --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
    --output text)

if [ -z "$RDS_SG" ] || [ "$RDS_SG" == "None" ]; then
    echo -e "${RED}❌ Could not find RDS security group${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Security Group: ${RDS_SG}${NC}"
echo ""

# Check if rule already exists
EXISTING_RULE=$(aws ec2 describe-security-group-rules \
    --filters "Name=group-id,Values=${RDS_SG}" \
    --region "$REGION" \
    --query "SecurityGroupRules[?CidrIpv4=='${MY_IP}/32' && IpProtocol=='tcp' && FromPort==\`5432\`].SecurityGroupRuleId" \
    --output text)

if [ -n "$EXISTING_RULE" ]; then
    echo -e "${YELLOW}⚠️  Rule already exists for your IP${NC}"
    echo -e "${GREEN}✅ RDS is already accessible from your IP${NC}"
    echo ""
else
    # Add temporary rule
    echo -e "${BLUE}🔓 Adding temporary access rule...${NC}"
    aws ec2 authorize-security-group-ingress \
        --group-id "$RDS_SG" \
        --protocol tcp \
        --port 5432 \
        --cidr "${MY_IP}/32" \
        --region "$REGION" \
        --tag-specifications "ResourceType=security-group-rule,Tags=[{Key=Name,Value=temp-db-access},{Key=CreatedBy,Value=db-allow-my-ip-script}]"

    echo -e "${GREEN}✅ Access granted!${NC}"
    echo ""

    RULE_ADDED=true
fi

# Get RDS endpoint and credentials
echo -e "${BLUE}🔍 Getting database connection info...${NC}"

RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "${ENV}-oneclicktag-db" \
    --region "$REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

DB_PASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id "${ENV}-oneclicktag-db-password" \
    --region "$REGION" \
    --query 'SecretString' \
    --output text)

DB_NAME="oneclicktag"
DB_USER="oneclicktag"

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}📊 DBeaver Connection Settings${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Connection Type:${NC} PostgreSQL"
echo -e "${YELLOW}Host:${NC}            ${RDS_ENDPOINT}"
echo -e "${YELLOW}Port:${NC}            5432"
echo -e "${YELLOW}Database:${NC}        ${DB_NAME}"
echo -e "${YELLOW}Username:${NC}        ${DB_USER}"
echo -e "${YELLOW}Password:${NC}        ${DB_PASSWORD}"
echo -e "${YELLOW}SSL:${NC}             Disabled (or optional)"
echo ""
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}✅ You can now connect to RDS from DBeaver${NC}"
echo ""
echo -e "${YELLOW}⚠️  Security Note:${NC}"
echo -e "This rule allows access only from your IP: ${GREEN}${MY_IP}${NC}"
echo ""

# Ask if user wants to revoke access immediately or keep it
echo -e "${YELLOW}Options:${NC}"
echo -e "  ${GREEN}1)${NC} Keep access open (you must manually revoke later)"
echo -e "  ${GREEN}2)${NC} Press Enter when done to auto-revoke access"
echo ""
read -p "Choose option (1 or 2): " CHOICE

if [ "$CHOICE" == "1" ]; then
    echo ""
    echo -e "${YELLOW}✅ Access will remain open${NC}"
    echo ""
    echo -e "${RED}🔴 To revoke access later, run:${NC}"
    echo -e "npm run db:revoke-my-ip:dev"
    echo ""
    echo -e "Or manually:"
    echo -e "aws ec2 revoke-security-group-ingress \\"
    echo -e "  --group-id ${RDS_SG} \\"
    echo -e "  --protocol tcp \\"
    echo -e "  --port 5432 \\"
    echo -e "  --cidr ${MY_IP}/32 \\"
    echo -e "  --region ${REGION}"
    echo ""
    exit 0
fi

# Option 2: Wait for user to finish and auto-revoke
echo ""
echo -e "${GREEN}✅ Access is open. Press Enter when you're done to revoke access...${NC}"
read

# Cleanup function
cleanup() {
    if [ "$RULE_ADDED" == "true" ]; then
        echo ""
        echo -e "${BLUE}🔒 Revoking access...${NC}"
        aws ec2 revoke-security-group-ingress \
            --group-id "$RDS_SG" \
            --protocol tcp \
            --port 5432 \
            --cidr "${MY_IP}/32" \
            --region "$REGION" 2>/dev/null || true
        echo -e "${GREEN}✅ Access revoked${NC}"
        echo -e "${YELLOW}🔐 RDS is now secure again${NC}"
    fi
}

# Register cleanup on script exit
trap cleanup EXIT

# Wait for user input
echo -e "${YELLOW}Press Ctrl+C to exit and revoke access${NC}"
sleep infinity
