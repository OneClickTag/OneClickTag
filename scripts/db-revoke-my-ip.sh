#!/bin/bash
# Revoke your IP's access to RDS

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
echo -e "${BLUE}  Revoke RDS Access${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo -e "${BLUE}Your IP: ${MY_IP}${NC}"
echo ""

# Get RDS security group
RDS_SG=$(aws rds describe-db-instances \
    --db-instance-identifier "${ENV}-oneclicktag-db" \
    --region "$REGION" \
    --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
    --output text)

echo -e "${BLUE}Security Group: ${RDS_SG}${NC}"
echo ""

# Check if rule exists
EXISTING_RULE=$(aws ec2 describe-security-group-rules \
    --filters "Name=group-id,Values=${RDS_SG}" \
    --region "$REGION" \
    --query "SecurityGroupRules[?CidrIpv4=='${MY_IP}/32' && IpProtocol=='tcp' && FromPort==\`5432\`].SecurityGroupRuleId" \
    --output text)

if [ -z "$EXISTING_RULE" ]; then
    echo -e "${YELLOW}⚠️  No rule found for your IP${NC}"
    echo -e "${GREEN}✅ RDS is already secure${NC}"
    exit 0
fi

echo -e "${BLUE}🔒 Revoking access...${NC}"
aws ec2 revoke-security-group-ingress \
    --group-id "$RDS_SG" \
    --protocol tcp \
    --port 5432 \
    --cidr "${MY_IP}/32" \
    --region "$REGION"

echo ""
echo -e "${GREEN}✅ Access revoked!${NC}"
echo -e "${YELLOW}🔐 RDS is now secure${NC}"
