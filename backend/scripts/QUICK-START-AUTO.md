# 🚀 AWS RDS Auto-Discovery Seeding - Ultra Quick Start

## ⚡ The Easiest Way - Just AWS Credentials!

```bash
# 1. Only set your AWS credentials in .env file
cd backend
cat >> .env << EOF
AWS_ACCESS_KEY_ID=your-key-from-process-env
AWS_SECRET_ACCESS_KEY=your-secret-from-process-env
AWS_REGION=eu-central-1
DB_PASSWORD=your-rds-password
EOF

# 2. Seed environments - RDS endpoints auto-discovered!
pnpm seed:rds:dev      # Automatically finds dev-* RDS
pnpm seed:rds:stage    # Automatically finds stage-* RDS
pnpm seed:rds:prod     # Automatically finds prod-* RDS
```

**That's it!** 🎉 No need to manually provide database URLs.

---

## 🤖 How Auto-Discovery Works

1. **Script connects to AWS** using your credentials
2. **Lists all RDS instances** in your region
3. **Finds matching instance** by environment name:
   - For `dev`: Looks for `dev-*`, `*-dev-*`, `*-dev`, `oneclicktag-dev`, etc.
   - For `stage`: Looks for `stage-*`, `*-stage-*`, `*-stage`, `oneclicktag-stage`, etc.
   - For `prod`: Looks for `prod-*`, `*-prod-*`, `*-prod`, `oneclicktag-prod`, etc.
4. **Auto-generates connection URL** using discovered endpoint
5. **Seeds the database** automatically

---

## 📋 Required Environment Variables (Minimal Setup)

```bash
# .env file
AWS_ACCESS_KEY_ID="your-key"           # Required
AWS_SECRET_ACCESS_KEY="your-secret"    # Required
AWS_REGION="eu-central-1"              # Optional (defaults to eu-central-1)
DB_PASSWORD="your-db-password"         # Required for connection
```

---

## 🎯 What You Get

### Auto-Discovered:
- ✅ RDS endpoint hostnames
- ✅ RDS ports
- ✅ Database engine types
- ✅ Instance status

### You Provide:
- AWS credentials
- Database password
- (Optional) Username, database name

---

## 🔧 Optional Configuration

### Custom Database Credentials

```bash
# General credentials (used for all environments)
DB_USERNAME="postgres"
DB_PASSWORD="your-password"
DB_NAME="oneclicktag"

# Or environment-specific (overrides general)
DEV_DB_USERNAME="dev_user"
DEV_DB_PASSWORD="dev_pass"
DEV_DB_NAME="oneclicktag_dev"

STAGE_DB_USERNAME="stage_user"
STAGE_DB_PASSWORD="stage_pass"
STAGE_DB_NAME="oneclicktag_stage"

PROD_DB_USERNAME="prod_user"
PROD_DB_PASSWORD="prod_pass"
PROD_DB_NAME="oneclicktag_prod"
```

---

## 🎨 Naming Your RDS Instances

For auto-discovery to work, name your RDS instances with the environment:

✅ **Good naming examples:**
- `dev-rds`
- `oneclicktag-dev`
- `myapp-dev-database`
- `stage-postgresql`
- `prod-oneclicktag-db`

❌ **Won't be detected:**
- `database-1`
- `myapp-rds`
- `postgresql-instance`

---

## 🔄 Backward Compatible - Manual URLs Still Work

If you prefer manual configuration or use non-AWS databases:

```bash
# Set these and they'll be used instead of auto-discovery
DEV_DATABASE_URL="postgresql://user:pass@localhost:5432/dev"
STAGE_DATABASE_URL="postgresql://user:pass@stage.example.com:5432/stage"
PROD_DATABASE_URL="postgresql://user:pass@prod.example.com:5432/prod"
```

---

## 📦 Example Output

```bash
$ pnpm seed:rds:dev

═══════════════════════════════════════════════════
🌱 Seeding DEV Database
═══════════════════════════════════════════════════

📡 No manual DATABASE_URL found, attempting AWS auto-discovery...

🔍 Discovering RDS instances from AWS...
✅ Found 3 RDS instance(s)

📋 Available RDS instances:
   1. dev-rds (available) - dev-rds.abc123.eu-central-1.rds.amazonaws.com
   2. stage-rds (available) - stage-rds.abc123.eu-central-1.rds.amazonaws.com
   3. prod-rds (available) - prod-rds.abc123.eu-central-1.rds.amazonaws.com

✅ Found RDS instance: dev-rds
   Endpoint: dev-rds.abc123.eu-central-1.rds.amazonaws.com:5432
   Engine: postgres
   Status: available

✅ Auto-generated database URL

📍 Source: AWS Auto-Discovery

🔌 Testing database connection...
✅ Database connection successful

🔍 Checking if database is already seeded...
✅ Database is empty, ready for seeding

🌱 Running seed script...
[seed output...]

✅ DEV Database Seeded Successfully
```

---

## 🐛 Troubleshooting

### "No RDS instances found"
```bash
# Check your AWS credentials and region
aws rds describe-db-instances --region eu-central-1

# Make sure you have RDS instances in that region
```

### "Could not find RDS instance for dev environment"
```bash
# Your RDS instances don't have 'dev' in the name
# Either:
# 1. Rename your RDS instance to include 'dev'
# 2. Set DEV_DATABASE_URL manually in .env
```

### "Failed to discover RDS instances"
```bash
# Check AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# Check IAM permissions - you need:
# - rds:DescribeDBInstances
```

### "Cannot connect to database"
```bash
# Check security group allows your IP
# Check database password is correct
# Check database username is correct

# Set DB_PASSWORD in .env
echo "DB_PASSWORD=your-password" >> .env
```

---

## 💡 Pro Tips

1. **Name consistently**: Use `{app}-{env}-{type}` pattern (e.g., `oneclicktag-dev-rds`)
2. **Same credentials**: Use same username/password across envs for simplicity
3. **Security groups**: Make sure your IP is whitelisted for RDS access
4. **IAM permissions**: Ensure your AWS user has `rds:DescribeDBInstances` permission
5. **Test with dev first**: Always test auto-discovery with dev before stage/prod

---

## 🔒 Security

- AWS credentials stored in `.env` (not committed to git)
- Database passwords stored in `.env` (not committed to git)
- Auto-discovery only **reads** RDS metadata (no modifications)
- Connection URLs are never logged (passwords masked)

---

## 📞 Need Help?

1. Read full docs: `backend/scripts/README-SEEDING.md`
2. Check error messages carefully
3. Verify AWS permissions
4. Test RDS connectivity manually
5. Contact dev team

---

**Created**: January 2025
**Feature**: AWS RDS Auto-Discovery
**Zero Configuration**: Just provide AWS credentials! 🚀
