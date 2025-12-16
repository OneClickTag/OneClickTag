# AWS RDS Database Seeding

This directory contains scripts for seeding AWS RDS databases across multiple environments (dev, stage, prod).

## 📋 Overview

The seeding system allows you to populate your AWS RDS databases with initial data including:

- **Admin User** - System administrator account
- **Content Pages** - About, Terms of Service, Privacy Policy
- **Pricing Plans** - Starter, Pro, Enterprise tiers
- **Landing Page Content** - Hero, Features, CTA sections
- **Site Settings** - Branding, colors, metadata
- **Contact Page Content** - Contact information and FAQs

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18+)
2. **pnpm** package manager
3. **AWS Credentials** with RDS access
4. **RDS instances** named with environment (e.g., `dev-rds`, `stage-rds`, `prod-rds`)

### ⚡ Easiest Setup - AWS Auto-Discovery (NEW!)

Create a `.env` file in the `backend/` directory with **only AWS credentials**:

```bash
# Minimal configuration - RDS endpoints auto-discovered!
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_REGION="eu-central-1"
DB_PASSWORD="your-database-password"
```

That's it! The script will automatically discover your RDS endpoints. 🎉

See `QUICK-START-AUTO.md` for details on auto-discovery.

### 🔧 Alternative - Manual Configuration

If you prefer manual setup or use non-AWS databases:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_REGION="eu-central-1"

# Manual Database URLs (bypasses auto-discovery)
DEV_DATABASE_URL="postgresql://username:password@dev-rds.eu-central-1.rds.amazonaws.com:5432/oneclicktag_dev?schema=public"
STAGE_DATABASE_URL="postgresql://username:password@stage-rds.eu-central-1.rds.amazonaws.com:5432/oneclicktag_stage?schema=public"
PROD_DATABASE_URL="postgresql://username:password@prod-rds.eu-central-1.rds.amazonaws.com:5432/oneclicktag_prod?schema=public"
```

### Install Dependencies

```bash
cd backend
pnpm install
```

## 📝 Usage

### Option 1: Using npm/pnpm Scripts (Recommended)

```bash
# Seed a specific environment
pnpm seed:rds:dev      # Seed dev environment
pnpm seed:rds:stage    # Seed stage environment
pnpm seed:rds:prod     # Seed production environment

# Seed all environments at once
pnpm seed:rds:all
```

### Option 2: Using the Shell Script Directly

```bash
# Seed a specific environment
./scripts/seed-all-envs.sh --env=dev

# Seed all environments (with confirmation)
./scripts/seed-all-envs.sh --all

# Seed all environments without confirmation prompts
./scripts/seed-all-envs.sh --all --skip-confirmation

# Seed production with no confirmation (use with caution!)
./scripts/seed-all-envs.sh --env=prod --skip-confirmation
```

### Option 3: Using TypeScript Script Directly

```bash
# Seed a specific environment
pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts dev
pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts stage
pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts prod
```

## 🛡️ Safety Features

### Upsert Logic
- The seed scripts use **upsert** operations (update or insert)
- Running the seed multiple times is **safe** - it won't create duplicates
- Existing records are updated with new values
- New records are created only if they don't exist

### Confirmation Prompts
- By default, the shell script asks for confirmation before seeding
- Use `--skip-confirmation` flag to bypass prompts (useful for CI/CD)

### Pre-Seed Checks
- ✅ Database connection validation
- ✅ AWS credentials verification
- ✅ Prerequisites check (Node.js, pnpm, dependencies)
- ✅ Environment variable validation

## 📂 Files

### `seed-rds.ts`
Main TypeScript seeding script that:
- Accepts environment argument (dev/stage/prod)
- Validates database connection
- Runs the Prisma seed script with custom database URL
- Provides detailed logging and error handling

### `seed-all-envs.sh`
Bash wrapper script that:
- Seeds multiple environments in sequence
- Validates prerequisites
- Provides colored output and progress tracking
- Supports confirmation prompts for safety
- Returns comprehensive summary

### `../prisma/seed.ts`
Main seed data definition that creates:
- Admin user
- Content pages
- Pricing plans
- Landing page content
- Site settings
- Contact page content

## 🤖 AWS RDS Auto-Discovery

### How It Works

The script can automatically discover RDS endpoints from AWS:

1. **Connects to AWS** using your credentials
2. **Lists all RDS instances** in your region
3. **Finds matching instance** by name pattern:
   - For `dev`: Looks for `dev-*`, `*-dev-*`, `*-dev`, etc.
   - For `stage`: Looks for `stage-*`, `*-stage-*`, `*-stage`, etc.
   - For `prod`: Looks for `prod-*`, `*-prod-*`, `*-prod`, etc.
4. **Auto-generates connection URL** using the discovered endpoint
5. **Seeds the database**

### RDS Naming Patterns

For auto-discovery to work, name your RDS instances with the environment:

✅ **Detected automatically:**
- `dev-rds`, `stage-rds`, `prod-rds`
- `oneclicktag-dev`, `oneclicktag-stage`, `oneclicktag-prod`
- `myapp-dev-database`, `myapp-stage-db`

❌ **Not detected:**
- `database-1`, `myapp-rds`, `postgresql-instance`

### Required IAM Permissions

Your AWS credentials need the following permission:

```json
{
  "Effect": "Allow",
  "Action": [
    "rds:DescribeDBInstances"
  ],
  "Resource": "*"
}
```

## 🔧 Troubleshooting

### "No RDS instances found"
**Problem**: Script cannot find any RDS instances

**Solution**:
```bash
# Check AWS credentials and region
aws rds describe-db-instances --region eu-central-1

# Verify RDS instances exist in the region
# Check AWS_REGION is set correctly
```

### "Could not find RDS instance for dev environment"
**Problem**: No RDS instance matches the environment name pattern

**Solution**:
1. Rename your RDS instance to include the environment (e.g., `dev-rds`)
2. OR set `DEV_DATABASE_URL` manually in `.env`

### "Database URL not found"
**Problem**: Environment variable for database URL is not set AND auto-discovery failed

**Solution**:
```bash
# Option 1: Check RDS instance naming
aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier'

# Option 2: Set DATABASE_URL manually
export DEV_DATABASE_URL="postgresql://..."
# Or add it to your .env file
```

### "AWS credentials not set"
**Problem**: AWS credentials are missing

**Solution**:
```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID="your-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
# Or add them to your .env file
```

### "Cannot connect to database"
**Problem**: Database connection failed

**Solutions**:
1. Check if your IP is whitelisted in RDS security group
2. Verify database credentials are correct
3. Ensure database endpoint is reachable
4. Check if database exists

```bash
# Test connection manually
psql "postgresql://username:password@endpoint:5432/database"
```

### "Permission denied: ./scripts/seed-all-envs.sh"
**Problem**: Script is not executable

**Solution**:
```bash
chmod +x scripts/seed-all-envs.sh
```

## 🔐 Security Best Practices

1. **Never commit `.env` files** with real credentials
2. **Use AWS IAM roles** when running in AWS environments (EC2, ECS, Lambda)
3. **Rotate credentials** regularly
4. **Use least privilege** - Grant only necessary RDS permissions
5. **Restrict production access** - Limit who can seed production database

### Recommended AWS IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds-db:connect"
      ],
      "Resource": [
        "arn:aws:rds-db:region:account-id:dbuser:db-instance-id/db-username"
      ]
    }
  ]
}
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Seed RDS Database
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    DEV_DATABASE_URL: ${{ secrets.DEV_DATABASE_URL }}
  run: |
    cd backend
    pnpm install
    pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts dev
```

### ECS Task Example (as used in seed-database.yml workflow)

The project includes a GitHub Actions workflow (`.github/workflows/seed-database.yml`) that runs seeding as an ECS Fargate task:

```bash
# Trigger manually via GitHub Actions
# 1. Go to Actions tab
# 2. Select "Seed Database" workflow
# 3. Click "Run workflow"
# 4. Choose environment (dev/stage/prod)
```

## 📊 Seeding Process Flow

```
1. Load environment variables (.env)
   ↓
2. Validate prerequisites
   ↓
3. Check AWS credentials
   ↓
4. Get database URL for environment
   ↓
5. Test database connection
   ↓
6. Check if database already has data
   ↓
7. Run seed script with Prisma
   ↓
8. Verify seeding success
   ↓
9. Display summary
```

## 📋 Seed Data Details

### Admin User
```typescript
Email: admin@oneclicktag.com
Role: SUPER_ADMIN
Auth: Firebase (no password stored)
```

### Content Pages
- **About** - Company information and mission
- **Terms** - Terms of service
- **Privacy** - Privacy policy and data handling

### Pricing Plans
- **Starter** - $29/month (5 customers, 25 trackings each)
- **Professional** - $99/month (25 customers, unlimited trackings)
- **Enterprise** - $299/month (unlimited customers & trackings)

### Landing Page Sections
- **Hero** - Main headline and CTA
- **Features** - 6 feature cards with icons
- **CTA** - Call-to-action section with testimonial

### Site Settings
- Brand name: "OneClickTag"
- Brand colors: Blue, Purple, Pink
- Meta tags and SEO settings

### Contact Page
- Contact information (email, phone, address)
- Business hours
- Social media links (Twitter, LinkedIn, GitHub)
- FAQs section
- Contact form settings

## 🎯 When to Use

### Development Environment
- **Frequency**: Regularly, as needed
- **Use Case**: Testing features with fresh data
- **Safety**: Low risk

### Staging Environment
- **Frequency**: Before major releases
- **Use Case**: QA testing with production-like data
- **Safety**: Medium risk

### Production Environment
- **Frequency**: Once during initial setup, rarely after
- **Use Case**: Initial deployment only
- **Safety**: ⚠️ HIGH RISK - Use extreme caution

## ⚠️ Important Notes

1. **Seeding production should only be done ONCE** during initial deployment
2. **Always backup production database** before seeding
3. **Test in dev/stage first** before running in production
4. **Review seed data** to ensure it matches your requirements
5. **Customize seed data** in `prisma/seed.ts` for your needs

## 🔗 Related Files

- `../prisma/schema.prisma` - Database schema definition
- `../prisma/seed.ts` - Main seed data script
- `../prisma/seed-customization.ts` - Additional customization seed data
- `../.env.example` - Example environment variables
- `../../.github/workflows/seed-database.yml` - CI/CD seeding workflow

## 💡 Tips

1. **Use different admin emails** for each environment:
   ```typescript
   // In seed.ts, customize based on NODE_ENV
   const adminEmail = process.env.NODE_ENV === 'production'
     ? 'admin@oneclicktag.com'
     : `admin-${process.env.NODE_ENV}@oneclicktag.com`;
   ```

2. **Add environment indicators** to seed data:
   ```typescript
   const brandName = process.env.NODE_ENV === 'production'
     ? 'OneClickTag'
     : `OneClickTag [${process.env.NODE_ENV.toUpperCase()}]`;
   ```

3. **Seed test users** in non-production environments:
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     // Create test users for dev/stage
   }
   ```

## 📞 Support

If you encounter issues with seeding:

1. Check the troubleshooting section above
2. Review error logs carefully
3. Verify all environment variables are set correctly
4. Test database connection manually
5. Contact the development team

---

**Last Updated**: January 2025
**Maintained by**: OneClickTag Development Team
