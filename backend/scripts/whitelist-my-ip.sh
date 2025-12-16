#!/bin/bash

#############################################################
# Whitelist Your IP for RDS Access
#############################################################
#
# This script automatically whitelists your current IP
# in the RDS security group so you can connect to the database.
#
# Usage:
#   ./scripts/whitelist-my-ip.sh <rds-instance-identifier>
#
# Example:
#   ./scripts/whitelist-my-ip.sh dev-oneclicktag-db
#
#############################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default region
AWS_REGION="${AWS_REGION:-eu-central-1}"

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if RDS instance identifier is provided
if [ -z "$1" ]; then
  print_error "Missing RDS instance identifier"
  echo ""
  echo "Usage:"
  echo "  ./scripts/whitelist-my-ip.sh <rds-instance-identifier>"
  echo ""
  echo "Example:"
  echo "  ./scripts/whitelist-my-ip.sh dev-oneclicktag-db"
  echo ""
  echo "Your RDS instances:"
  aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,DBInstanceStatus]' \
    --output table 2>/dev/null || echo "Run 'aws rds describe-db-instances' to list your RDS instances"
  exit 1
fi

RDS_INSTANCE="$1"

echo ""
echo "═══════════════════════════════════════════════════"
echo "Whitelisting Your IP for RDS Access"
echo "═══════════════════════════════════════════════════"
echo ""

# Get your public IP
print_info "Getting your public IP address..."
MY_IP=$(curl -4 -s ifconfig.me)

if [ -z "$MY_IP" ]; then
  print_error "Failed to get your public IP"
  exit 1
fi

print_success "Your IP: $MY_IP"
echo ""

# Get RDS instance details
print_info "Fetching RDS instance details..."

RDS_DETAILS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE" \
  --region "$AWS_REGION" \
  --query 'DBInstances[0]' \
  --output json 2>&1)

if [ $? -ne 0 ]; then
  print_error "Failed to find RDS instance: $RDS_INSTANCE"
  echo "$RDS_DETAILS"
  exit 1
fi

# Extract security group ID
SG_ID=$(echo "$RDS_DETAILS" | jq -r '.VpcSecurityGroups[0].VpcSecurityGroupId')

if [ -z "$SG_ID" ] || [ "$SG_ID" = "null" ]; then
  print_error "Could not find security group for RDS instance"
  exit 1
fi

print_success "RDS Instance: $RDS_INSTANCE"
print_success "Security Group: $SG_ID"
print_success "Region: $AWS_REGION"
echo ""

# Check if IP is already whitelisted
print_info "Checking if your IP is already whitelisted..."

EXISTING_RULE=$(aws ec2 describe-security-groups \
  --group-ids "$SG_ID" \
  --region "$AWS_REGION" \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\`].IpRanges[?CidrIp==\`${MY_IP}/32\`]" \
  --output text)

if [ ! -z "$EXISTING_RULE" ]; then
  print_success "Your IP ($MY_IP) is already whitelisted!"
  echo ""
  print_info "You should be able to connect now:"
  echo "  pnpm seed:rds:dev"
  exit 0
fi

# Add IP to security group
print_info "Adding your IP to security group..."
echo ""

ADD_RESULT=$(aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 5432 \
  --cidr "${MY_IP}/32" \
  --region "$AWS_REGION" 2>&1)

if [ $? -ne 0 ]; then
  # Check if rule already exists (different error message)
  if echo "$ADD_RESULT" | grep -q "already exists"; then
    print_success "Your IP ($MY_IP) is already whitelisted!"
  else
    print_error "Failed to add security group rule"
    echo "$ADD_RESULT"
    exit 1
  fi
else
  print_success "Successfully whitelisted your IP: $MY_IP"
fi

echo ""
echo "═══════════════════════════════════════════════════"
print_success "Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""

# Get RDS endpoint
RDS_ENDPOINT=$(echo "$RDS_DETAILS" | jq -r '.Endpoint.Address')
RDS_PORT=$(echo "$RDS_DETAILS" | jq -r '.Endpoint.Port')

print_info "RDS Endpoint: $RDS_ENDPOINT:$RDS_PORT"
echo ""

print_info "Test connection:"
echo "  telnet $RDS_ENDPOINT $RDS_PORT"
echo ""

print_info "Or run seeding:"
echo "  pnpm seed:rds:dev"
echo ""

print_info "Connect with DBeaver:"
echo "  Host: $RDS_ENDPOINT"
echo "  Port: $RDS_PORT"
echo "  Database: oneclicktag (or postgres)"
echo "  Username: postgres (or your master username)"
echo "  Password: [your DB_PASSWORD from .env]"
echo ""
