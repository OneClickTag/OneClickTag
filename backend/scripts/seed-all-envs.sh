#!/bin/bash

#############################################################
# AWS RDS Multi-Environment Seeding Script
#############################################################
#
# Seeds all AWS RDS environments (dev, stage, prod)
#
# Usage:
#   ./scripts/seed-all-envs.sh [options]
#
# Options:
#   --env=<environment>  Seed specific environment only (dev|stage|prod)
#   --all                Seed all environments (default)
#   --skip-confirmation  Skip confirmation prompts
#   --help               Show this help message
#
# Environment Variables Required:
#   AWS_ACCESS_KEY_ID            AWS access key
#   AWS_SECRET_ACCESS_KEY        AWS secret key
#   DEV_DATABASE_URL             Dev database connection string
#   STAGE_DATABASE_URL           Stage database connection string
#   PROD_DATABASE_URL            Production database connection string
#
# Examples:
#   ./scripts/seed-all-envs.sh --env=dev
#   ./scripts/seed-all-envs.sh --all
#   ./scripts/seed-all-envs.sh --env=prod --skip-confirmation
#
#############################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Default options
SEED_ENV=""
SEED_ALL=true
SKIP_CONFIRMATION=false

#############################################################
# Functions
#############################################################

print_header() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

show_help() {
  cat << EOF
AWS RDS Multi-Environment Seeding Script

Usage:
  ./scripts/seed-all-envs.sh [options]

Options:
  --env=<environment>  Seed specific environment only (dev|stage|prod)
  --all                Seed all environments (default)
  --skip-confirmation  Skip confirmation prompts
  --help               Show this help message

Environment Variables Required:
  AWS_ACCESS_KEY_ID            AWS access key
  AWS_SECRET_ACCESS_KEY        AWS secret key
  DEV_DATABASE_URL             Dev database connection string
  STAGE_DATABASE_URL           Stage database connection string
  PROD_DATABASE_URL            Production database connection string

Examples:
  ./scripts/seed-all-envs.sh --env=dev
  ./scripts/seed-all-envs.sh --all
  ./scripts/seed-all-envs.sh --env=prod --skip-confirmation

EOF
  exit 0
}

check_prerequisites() {
  print_info "Checking prerequisites..."

  # Check if we're in the backend directory
  if [ ! -f "$BACKEND_DIR/package.json" ]; then
    print_error "package.json not found. Please run this script from the backend directory."
    exit 1
  fi

  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
  fi

  # Check if pnpm is installed
  if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Please install pnpm first."
    exit 1
  fi

  # Check if ts-node is available
  if ! pnpm list ts-node &> /dev/null; then
    print_warning "ts-node not found. Installing dependencies..."
    cd "$BACKEND_DIR"
    pnpm install
  fi

  # Check AWS credentials
  if [ -z "${AWS_ACCESS_KEY_ID}" ]; then
    print_error "AWS_ACCESS_KEY_ID is not set"
    exit 1
  fi

  if [ -z "${AWS_SECRET_ACCESS_KEY}" ]; then
    print_error "AWS_SECRET_ACCESS_KEY is not set"
    exit 1
  fi

  print_success "Prerequisites check passed"
  echo ""
}

check_database_url() {
  local env=$1
  local env_upper=$(echo "$env" | tr '[:lower:]' '[:upper:]')
  local var_name="${env_upper}_DATABASE_URL"

  if [ -z "${!var_name}" ]; then
    print_error "$var_name is not set"
    return 1
  fi

  print_success "$var_name is set"
  return 0
}

confirm_seed() {
  local env=$1

  if [ "$SKIP_CONFIRMATION" = true ]; then
    return 0
  fi

  echo ""
  echo -e "${YELLOW}⚠️  WARNING: You are about to seed the ${env^^} database${NC}"
  echo -e "${YELLOW}This will create/update seed data in the database.${NC}"
  echo ""
  read -p "Are you sure you want to continue? (yes/no): " -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_warning "Seeding cancelled for $env"
    return 1
  fi

  return 0
}

seed_environment() {
  local env=$1

  print_header "Seeding ${env^^} Environment"

  # Check if database URL is set
  if ! check_database_url "$env"; then
    print_error "Skipping $env environment - database URL not configured"
    return 1
  fi

  # Confirm seeding (unless skip-confirmation is set)
  if ! confirm_seed "$env"; then
    return 1
  fi

  # Run the seed script
  print_info "Running seed script for $env..."
  echo ""

  cd "$BACKEND_DIR"

  if pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts "$env"; then
    print_success "$env environment seeded successfully"
    return 0
  else
    print_error "Failed to seed $env environment"
    return 1
  fi
}

#############################################################
# Parse Arguments
#############################################################

for arg in "$@"; do
  case $arg in
    --env=*)
      SEED_ENV="${arg#*=}"
      SEED_ALL=false
      ;;
    --all)
      SEED_ALL=true
      ;;
    --skip-confirmation)
      SKIP_CONFIRMATION=true
      ;;
    --help)
      show_help
      ;;
    *)
      print_error "Unknown option: $arg"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

#############################################################
# Main Execution
#############################################################

print_header "AWS RDS Database Seeding"

# Check prerequisites
check_prerequisites

# Track results
RESULTS=()

if [ "$SEED_ALL" = true ]; then
  # Seed all environments
  print_info "Seeding all environments: dev, stage, prod"
  echo ""

  for env in dev stage prod; do
    if seed_environment "$env"; then
      RESULTS+=("${GREEN}✅ $env: SUCCESS${NC}")
    else
      RESULTS+=("${RED}❌ $env: FAILED${NC}")
    fi
    echo ""
  done
else
  # Seed specific environment
  if [ -z "$SEED_ENV" ]; then
    print_error "No environment specified. Use --env=<environment> or --all"
    exit 1
  fi

  # Validate environment
  if [[ ! "$SEED_ENV" =~ ^(dev|stage|prod)$ ]]; then
    print_error "Invalid environment: $SEED_ENV"
    print_info "Valid environments: dev, stage, prod"
    exit 1
  fi

  if seed_environment "$SEED_ENV"; then
    RESULTS+=("${GREEN}✅ $SEED_ENV: SUCCESS${NC}")
  else
    RESULTS+=("${RED}❌ $SEED_ENV: FAILED${NC}")
  fi
fi

# Print summary
print_header "Seeding Summary"

for result in "${RESULTS[@]}"; do
  echo -e "$result"
done

echo ""

# Exit with appropriate code
if [[ "${RESULTS[@]}" =~ "FAILED" ]]; then
  print_error "Some environments failed to seed"
  exit 1
else
  print_success "All environments seeded successfully"
  exit 0
fi
