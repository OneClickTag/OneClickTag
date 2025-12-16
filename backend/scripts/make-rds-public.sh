#!/bin/bash

#############################################################
# Make RDS Publicly Accessible (Development Only!)
#############################################################
#
# WARNING: This should only be used for dev/stage environments!
# NEVER make production RDS publicly accessible!
#
# Usage:
#   ./scripts/make-rds-public.sh <rds-instance-identifier>
#
# Example:
#   ./scripts/make-rds-public.sh dev-oneclicktag-db
#
#############################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

AWS_REGION="${AWS_REGION:-eu-central-1}"

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

if [ -z "$1" ]; then
  print_error "Missing RDS instance identifier"
  echo ""
  echo "Usage: ./scripts/make-rds-public.sh <rds-instance-identifier>"
  echo ""
  echo "Example:"
  echo "  ./scripts/make-rds-public.sh dev-oneclicktag-db"
  exit 1
fi

RDS_INSTANCE="$1"

echo ""
echo "═══════════════════════════════════════════════════"
echo "⚠️  Making RDS Publicly Accessible"
echo "═══════════════════════════════════════════════════"
echo ""

# Safety check for production
if [[ "$RDS_INSTANCE" == *"prod"* ]]; then
  print_warning "PRODUCTION DATABASE DETECTED!"
  echo ""
  echo "Making production RDS publicly accessible is a SECURITY RISK!"
  echo ""
  read -p "Are you ABSOLUTELY sure? Type 'YES I UNDERSTAND THE RISK' to continue: " -r
  if [[ ! $REPLY == "YES I UNDERSTAND THE RISK" ]]; then
    print_info "Cancelled. Good choice!"
    exit 0
  fi
fi

print_info "Checking current RDS status..."
CURRENT_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE" \
  --region "$AWS_REGION" \
  --query 'DBInstances[0].PubliclyAccessible' \
  --output text)

if [ "$CURRENT_STATUS" = "True" ]; then
  print_success "RDS is already publicly accessible!"
  echo ""
  print_info "You should be able to connect now (after whitelisting your IP)"
  exit 0
fi

print_warning "Current status: PubliclyAccessible = False"
echo ""

print_info "Modifying RDS to be publicly accessible..."
print_warning "This will cause a brief restart of the database!"
echo ""

read -p "Continue? (y/n): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_info "Cancelled"
  exit 0
fi

# Modify RDS instance
aws rds modify-db-instance \
  --db-instance-identifier "$RDS_INSTANCE" \
  --publicly-accessible \
  --apply-immediately \
  --region "$AWS_REGION" \
  > /dev/null

print_success "RDS modification initiated"
echo ""

print_info "Waiting for RDS to be available..."
print_warning "This may take 2-5 minutes..."
echo ""

aws rds wait db-instance-available \
  --db-instance-identifier "$RDS_INSTANCE" \
  --region "$AWS_REGION"

print_success "RDS is now publicly accessible!"
echo ""

# Get endpoint
ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE" \
  --region "$AWS_REGION" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "═══════════════════════════════════════════════════"
print_success "Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""

print_info "Next steps:"
echo "  1. Make sure your IP is whitelisted:"
echo "     ./scripts/whitelist-my-ip.sh $RDS_INSTANCE"
echo ""
echo "  2. Set DB_PASSWORD in .env:"
echo "     echo 'DB_PASSWORD=your-password' >> .env"
echo ""
echo "  3. Test connection:"
echo "     nc -zv $ENDPOINT 5432"
echo ""
echo "  4. Run seeding:"
echo "     pnpm seed:rds:dev"
echo ""

print_warning "Security Note:"
echo "  Remember to restrict access via security group!"
echo "  Only your whitelisted IP can connect."
echo ""
