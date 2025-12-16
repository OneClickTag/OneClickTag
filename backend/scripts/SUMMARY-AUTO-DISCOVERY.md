# ✅ AWS RDS Auto-Discovery Feature - Complete

## 🎉 What's New

The seeding scripts now support **AWS RDS Auto-Discovery**!

**Before**: You had to manually provide full database URLs for each environment.

**Now**: Just provide AWS credentials and the script automatically discovers your RDS endpoints!

---

## 📦 What Was Added

### 1. **AWS SDK Integration**
- Installed `@aws-sdk/client-rds` package
- Enables programmatic RDS instance discovery

### 2. **Auto-Discovery Logic** (`seed-rds.ts`)
- Discovers all RDS instances in your AWS region
- Matches instances to environments by name pattern
- Auto-generates connection URLs
- Falls back to manual configuration if needed

### 3. **Smart Instance Matching**
Automatically detects RDS instances with these naming patterns:
- `dev-*` → matches dev environment
- `*-dev-*` → matches dev environment
- `oneclicktag-dev` → matches dev environment
- (Same for `stage` and `prod`)

### 4. **Updated Documentation**
- `QUICK-START-AUTO.md` - New ultra-quick setup guide
- `README-SEEDING.md` - Updated with auto-discovery section
- `TESTING.md` - Updated testing procedures
- `.env.example` - Updated with new variables

---

## 🚀 How to Use

### Minimal Setup (Recommended)

```bash
# backend/.env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=eu-central-1
DB_PASSWORD=your-db-password
```

Then just run:
```bash
pnpm seed:rds:dev    # Auto-discovers dev-* RDS
pnpm seed:rds:stage  # Auto-discovers stage-* RDS
pnpm seed:rds:prod   # Auto-discovers prod-* RDS
```

### What Happens

1. ✅ Script connects to AWS
2. ✅ Lists all RDS instances
3. ✅ Finds instance matching environment (e.g., `dev-rds`)
4. ✅ Extracts endpoint: `dev-rds.abc123.region.rds.amazonaws.com:5432`
5. ✅ Builds connection URL: `postgresql://postgres:password@endpoint:5432/oneclicktag`
6. ✅ Seeds the database

---

## 🔄 Backward Compatible

Old configurations still work! If you set `DEV_DATABASE_URL`, it will be used instead of auto-discovery.

```bash
# Manual URL takes precedence over auto-discovery
DEV_DATABASE_URL="postgresql://user:pass@custom-host:5432/db"
```

This is useful for:
- Non-AWS databases
- Custom database setups
- Bypassing auto-discovery

---

## 📋 Required Environment Variables

### Minimal (Auto-Discovery)
```bash
AWS_ACCESS_KEY_ID          # Required
AWS_SECRET_ACCESS_KEY      # Required
AWS_REGION                 # Optional (defaults to eu-central-1)
DB_PASSWORD                # Required
```

### Optional (Fine-tuning)
```bash
DB_USERNAME                # Defaults to 'postgres'
DB_NAME                    # Defaults to 'oneclicktag'
DEV_DB_PASSWORD            # Override password for dev
STAGE_DB_PASSWORD          # Override password for stage
PROD_DB_PASSWORD           # Override password for prod
```

### Backward Compatible (Manual URLs)
```bash
DEV_DATABASE_URL           # Full URL for dev (bypasses auto-discovery)
STAGE_DATABASE_URL         # Full URL for stage
PROD_DATABASE_URL          # Full URL for prod
```

---

## 🔒 Security & Permissions

### Required IAM Permission

Your AWS user/role needs:
```json
{
  "Effect": "Allow",
  "Action": ["rds:DescribeDBInstances"],
  "Resource": "*"
}
```

### What the Script Does
- ✅ **Reads** RDS metadata only (read-only operation)
- ✅ Never modifies RDS instances
- ✅ Never logs passwords
- ✅ Uses environment variables for credentials (not hardcoded)

### What You Need to Protect
- 🔒 `.env` file (contains AWS credentials)
- 🔒 Database passwords
- 🔒 AWS access keys

**Never commit `.env` to git!**

---

## 🎯 RDS Naming Best Practices

For seamless auto-discovery, name your RDS instances clearly:

### ✅ Good Examples
```
dev-rds
stage-rds
prod-rds
oneclicktag-dev
oneclicktag-stage
oneclicktag-prod
myapp-dev-database
myapp-stage-postgresql
```

### ❌ Bad Examples
```
database-1
my-rds
postgresql-instance
oneclicktag-database  (no env indicator)
```

**Pattern**: Include environment name (`dev`, `stage`, `prod`) in the identifier.

---

## 🧪 Testing

### Test Auto-Discovery (Safe - No Seeding)

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"

# Run script with dev environment
# It will discover RDS and attempt connection
# (Will fail at DB connection if password is wrong, which is expected)
pnpm seed:rds:dev
```

**Expected Output:**
```
📡 No manual DATABASE_URL found, attempting AWS auto-discovery...
🔍 Discovering RDS instances from AWS...
✅ Found 3 RDS instance(s)

📋 Available RDS instances:
   1. dev-rds (available) - dev-rds.abc.region.rds.amazonaws.com
   2. stage-rds (available) - stage-rds.abc.region.rds.amazonaws.com
   3. prod-rds (available) - prod-rds.abc.region.rds.amazonaws.com

✅ Found RDS instance: dev-rds
   Endpoint: dev-rds.abc.region.rds.amazonaws.com:5432
   Engine: postgres
   Status: available
```

---

## 🐛 Common Issues

### "No RDS instances found"
- **Cause**: No RDS in the region, or wrong region
- **Fix**: Check `AWS_REGION` and verify RDS exists

### "Could not find RDS instance for dev environment"
- **Cause**: RDS name doesn't include 'dev'
- **Fix**: Rename RDS to `dev-*` or set `DEV_DATABASE_URL` manually

### "Failed to discover RDS instances: AccessDenied"
- **Cause**: IAM user lacks `rds:DescribeDBInstances` permission
- **Fix**: Add IAM permission (see Security section)

### "Cannot connect to database"
- **Cause**: Wrong password, or security group blocks connection
- **Fix**:
  1. Check `DB_PASSWORD` is correct
  2. Whitelist your IP in RDS security group

---

## 📊 Feature Comparison

| Feature | Before | After (Auto-Discovery) |
|---------|--------|------------------------|
| **Setup Complexity** | High - Manual URLs needed | Low - Just AWS creds |
| **Maintenance** | Update URLs when RDS changes | Automatic |
| **New Environments** | Add full URL manually | Auto-detected |
| **RDS Endpoint Changes** | Manual update | Auto-detected |
| **Non-AWS Databases** | Supported | Still supported (manual URL) |
| **Configuration Lines** | ~6 variables | ~4 variables |

---

## 🎓 How It Works Internally

```
1. User runs: pnpm seed:rds:dev

2. Script checks:
   - Is DEV_DATABASE_URL set? → Use it (manual mode)
   - Not set? → Try auto-discovery

3. Auto-discovery flow:
   - Connect to AWS RDS API
   - Call DescribeDBInstances()
   - Get list of all RDS instances
   - Filter by name patterns (dev-*, *-dev-*, etc.)
   - Extract endpoint address and port

4. Build connection URL:
   - Username: DB_USERNAME or DEV_DB_USERNAME (defaults to 'postgres')
   - Password: DB_PASSWORD or DEV_DB_PASSWORD
   - Host: Extracted from RDS endpoint
   - Port: Extracted from RDS endpoint (defaults to 5432)
   - Database: DB_NAME or DEV_DB_NAME (defaults to 'oneclicktag')

5. Connect and seed:
   - Test connection with Prisma
   - Run seed script via `pnpm prisma db seed`
   - Report success/failure
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `seed-rds.ts` | Main script with auto-discovery logic |
| `seed-all-envs.sh` | Bash wrapper for seeding all environments |
| `QUICK-START-AUTO.md` | Ultra-quick setup guide |
| `README-SEEDING.md` | Complete documentation |
| `TESTING.md` | Testing and verification guide |
| `.env.example` | Environment variable template |
| `package.json` | NPM scripts for seeding |

---

## 🚀 Next Steps

1. **Set AWS credentials** in `.env`
2. **Verify RDS naming** includes environment (dev/stage/prod)
3. **Test with dev first**: `pnpm seed:rds:dev`
4. **Seed stage**: `pnpm seed:rds:stage`
5. **Seed prod** (with caution): `pnpm seed:rds:prod`

---

## 💡 Benefits

✅ **Faster setup** - No need to copy/paste RDS endpoints
✅ **Less error-prone** - No typos in manual URLs
✅ **Auto-updates** - RDS endpoint changes are detected automatically
✅ **Simplified configuration** - Fewer environment variables
✅ **Better developer experience** - Just provide credentials and go
✅ **Still flexible** - Manual URLs still work for special cases

---

## 📞 Support

If you encounter issues:

1. Check this document first
2. Read `QUICK-START-AUTO.md` for setup
3. Read `README-SEEDING.md` for full details
4. Check `TESTING.md` for verification steps
5. Review error messages carefully
6. Contact dev team if stuck

---

**Feature Status**: ✅ Complete & Tested
**Version**: 1.0
**Created**: January 2025
**Backward Compatible**: Yes
**Breaking Changes**: None
