# 🚀 AWS RDS Seeding - Quick Start Guide

## ⚡ TL;DR - Just Run This

```bash
# 1. Set your environment variables in .env file
cd backend
cp .env.example .env
# Edit .env and add your AWS credentials and database URLs

# 2. Seed a specific environment
pnpm seed:rds:dev      # Development
pnpm seed:rds:stage    # Staging
pnpm seed:rds:prod     # Production

# 3. Or seed all at once
pnpm seed:rds:all
```

## 📋 Required Environment Variables

Add these to `backend/.env`:

```bash
# AWS Credentials (from your .env file)
AWS_ACCESS_KEY_ID=process.env.AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=process.env.AWS_SECRET_ACCESS_KEY

# Database URLs
DEV_DATABASE_URL="postgresql://user:pass@dev-rds.region.rds.amazonaws.com:5432/db"
STAGE_DATABASE_URL="postgresql://user:pass@stage-rds.region.rds.amazonaws.com:5432/db"
PROD_DATABASE_URL="postgresql://user:pass@prod-rds.region.rds.amazonaws.com:5432/db"
```

## 🎯 Commands

### Seed Individual Environments

```bash
pnpm seed:rds:dev       # Seed dev environment
pnpm seed:rds:stage     # Seed stage environment
pnpm seed:rds:prod      # Seed prod environment
```

### Seed All Environments

```bash
# With confirmation prompts (safe)
pnpm seed:rds:all

# Without confirmation (automated)
./scripts/seed-all-envs.sh --all --skip-confirmation
```

### Seed Specific Environment via Shell Script

```bash
./scripts/seed-all-envs.sh --env=dev
./scripts/seed-all-envs.sh --env=stage
./scripts/seed-all-envs.sh --env=prod --skip-confirmation
```

## 📦 What Gets Seeded?

- ✅ Admin user (`admin@oneclicktag.com`)
- ✅ Content pages (About, Terms, Privacy)
- ✅ Pricing plans (Starter $29, Pro $99, Enterprise $299)
- ✅ Landing page content (Hero, Features, CTA)
- ✅ Site settings (Branding, colors, meta)
- ✅ Contact page content

## 🛡️ Safety

- **Upsert logic**: Running multiple times is safe - no duplicates
- **Confirmation prompts**: Asks before seeding (unless `--skip-confirmation`)
- **Connection testing**: Validates DB connection before seeding
- **Detailed logs**: Shows exactly what's happening

## ⚠️ Important Notes

### Development (dev)
✅ Safe to run anytime
✅ No confirmation needed usually
✅ Use for testing

### Staging (stage)
⚠️  Run before major releases
⚠️  Confirm before running
⚠️  Test QA scenarios

### Production (prod)
🚨 **DANGER ZONE**
🚨 **RUN ONLY ONCE** during initial deployment
🚨 **BACKUP DATABASE FIRST**
🚨 **CONFIRM TWICE**

## 🐛 Troubleshooting

### "Database URL not found"
```bash
# Check if env var is set
echo $DEV_DATABASE_URL
# Add to .env file if missing
```

### "AWS credentials not set"
```bash
# Check credentials
echo $AWS_ACCESS_KEY_ID
# Add to .env file
```

### "Cannot connect to database"
```bash
# Test connection manually
psql "postgresql://user:pass@host:5432/database"
# Check:
# - IP whitelisted in RDS security group?
# - Correct credentials?
# - Database exists?
```

### "Permission denied"
```bash
# Make script executable
chmod +x scripts/seed-all-envs.sh
```

## 📞 Need Help?

1. Read full docs: `backend/scripts/README-SEEDING.md`
2. Check error logs carefully
3. Verify .env variables are correct
4. Test DB connection manually
5. Contact dev team

## 🔥 Pro Tips

1. **Always test in dev first** before stage/prod
2. **Backup production** before seeding
3. **Use process.env variables** - don't hardcode credentials
4. **Check GitHub Actions** - seed-database.yml workflow available
5. **Customize seed data** in `backend/prisma/seed.ts` as needed

---

**Created**: January 2025
**Location**: `/backend/scripts/`
**Full Docs**: `README-SEEDING.md`
