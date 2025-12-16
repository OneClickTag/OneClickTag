# 📚 AWS RDS Seeding Scripts - Documentation Index

## 🚀 Quick Access

| What You Need | Read This |
|---------------|-----------|
| **Fastest setup** | `QUICK-START-AUTO.md` ⚡ |
| **Original setup (manual URLs)** | `QUICK-START.md` |
| **Complete guide** | `README-SEEDING.md` 📖 |
| **Testing & verification** | `TESTING.md` 🧪 |
| **What's new** | `SUMMARY-AUTO-DISCOVERY.md` 🎉 |

---

## ⚡ Ultra Quick Start (NEW!)

**Just provide AWS credentials** - RDS endpoints auto-discovered!

```bash
# 1. Set credentials in .env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
DB_PASSWORD=your-db-password

# 2. Seed environments
pnpm seed:rds:dev
pnpm seed:rds:stage
pnpm seed:rds:prod
```

**Requirements:**
- RDS instances named with environment (e.g., `dev-rds`, `stage-rds`, `prod-rds`)
- IAM permission: `rds:DescribeDBInstances`

See `QUICK-START-AUTO.md` for details.

---

## 📖 Documentation Files

### 🌟 `QUICK-START-AUTO.md` (Recommended)
- **For**: New users with AWS RDS
- **Setup**: Minimal - just AWS credentials
- **Feature**: Auto-discovery of RDS endpoints
- **Time**: 2 minutes

### 📄 `QUICK-START.md`
- **For**: Users preferring manual configuration
- **Setup**: Full DATABASE_URLs
- **Feature**: Direct connection (no auto-discovery)
- **Time**: 5 minutes

### 📚 `README-SEEDING.md`
- **For**: Complete reference
- **Contains**: All features, troubleshooting, CI/CD examples
- **Length**: Comprehensive guide

### 🧪 `TESTING.md`
- **For**: Verification and testing
- **Contains**: Test checklist, expected outputs, debugging
- **Use when**: Verifying setup or troubleshooting

### 🎉 `SUMMARY-AUTO-DISCOVERY.md`
- **For**: Understanding the new auto-discovery feature
- **Contains**: Feature overview, benefits, how it works
- **Use when**: Learning about AWS RDS auto-discovery

---

## 🛠️ Scripts

### `seed-rds.ts`
Main TypeScript seeding script with AWS RDS auto-discovery.

**Features:**
- ✅ AWS RDS auto-discovery
- ✅ Backward compatible (manual URLs)
- ✅ Smart instance matching by name
- ✅ Safe upsert logic
- ✅ Connection validation

**Usage:**
```bash
pnpm seed:rds:dev
pnpm seed:rds:stage
pnpm seed:rds:prod
```

### `seed-all-envs.sh`
Bash wrapper for seeding all environments at once.

**Features:**
- ✅ Seeds all environments sequentially
- ✅ Confirmation prompts (optional)
- ✅ Color-coded output
- ✅ Comprehensive error handling

**Usage:**
```bash
./scripts/seed-all-envs.sh --all
./scripts/seed-all-envs.sh --env=dev
./scripts/seed-all-envs.sh --env=prod --skip-confirmation
```

---

## 🎯 Common Tasks

### First Time Setup
1. Read `QUICK-START-AUTO.md`
2. Set AWS credentials in `.env`
3. Run `pnpm seed:rds:dev`

### Seed All Environments
```bash
pnpm seed:rds:all
```

### Seed Specific Environment
```bash
pnpm seed:rds:dev      # Development
pnpm seed:rds:stage    # Staging
pnpm seed:rds:prod     # Production
```

### Verify Setup
1. Read `TESTING.md`
2. Run compilation check: `pnpm exec tsc --noEmit scripts/seed-rds.ts`
3. Test help: `pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts`

### Troubleshooting
1. Check error message
2. Look in `README-SEEDING.md` → Troubleshooting section
3. Verify AWS credentials
4. Check RDS instance naming
5. Test RDS connectivity manually

---

## 🔑 Environment Variables

### Minimal Setup (Auto-Discovery)
```bash
AWS_ACCESS_KEY_ID          # Required
AWS_SECRET_ACCESS_KEY      # Required
AWS_REGION                 # Optional (defaults to eu-central-1)
DB_PASSWORD                # Required
```

### Optional Fine-Tuning
```bash
DB_USERNAME                # Defaults to 'postgres'
DB_NAME                    # Defaults to 'oneclicktag'
DEV_DB_PASSWORD            # Override for dev
STAGE_DB_PASSWORD          # Override for stage
PROD_DB_PASSWORD           # Override for prod
```

### Manual URLs (Backward Compatible)
```bash
DEV_DATABASE_URL           # Full URL (bypasses auto-discovery)
STAGE_DATABASE_URL         # Full URL
PROD_DATABASE_URL          # Full URL
```

---

## 📦 What Gets Seeded

- ✅ Admin user (`admin@oneclicktag.com`)
- ✅ Content pages (About, Terms, Privacy)
- ✅ Pricing plans (Starter $29, Pro $99, Enterprise $299)
- ✅ Landing page content (Hero, Features, CTA)
- ✅ Site settings (Branding, colors, metadata)
- ✅ Contact page content (Email, phone, FAQs)

All data uses **upsert logic** - safe to run multiple times!

---

## 🚨 Important Notes

### Development
- ✅ Safe to run anytime
- ✅ No confirmation needed
- ✅ Use for testing

### Staging
- ⚠️  Run before major releases
- ⚠️  Confirm before running
- ⚠️  Test QA scenarios

### Production
- 🚨 **DANGER ZONE**
- 🚨 **RUN ONLY ONCE** during initial deployment
- 🚨 **BACKUP DATABASE FIRST**
- 🚨 **VERIFY TWICE**

---

## 🆕 What's New (Auto-Discovery)

The scripts now support **AWS RDS Auto-Discovery**!

**Before**: Manual DATABASE_URLs for each environment
**Now**: Just AWS credentials - RDS endpoints auto-discovered

**Benefits:**
- ✅ Faster setup (fewer variables)
- ✅ Auto-updates when RDS endpoints change
- ✅ Less error-prone
- ✅ Simpler configuration

See `SUMMARY-AUTO-DISCOVERY.md` for details.

---

## 🔗 Related Files

```
backend/
├── scripts/
│   ├── README.md                    ← You are here
│   ├── QUICK-START-AUTO.md          ← Start here (auto-discovery)
│   ├── QUICK-START.md               ← Start here (manual)
│   ├── README-SEEDING.md            ← Complete guide
│   ├── TESTING.md                   ← Verification guide
│   ├── SUMMARY-AUTO-DISCOVERY.md    ← What's new
│   ├── seed-rds.ts                  ← Main script
│   └── seed-all-envs.sh             ← Bash wrapper
├── .env.example                     ← Environment template
├── package.json                     ← NPM scripts
└── prisma/
    └── seed.ts                      ← Seed data definitions
```

---

## 📞 Getting Help

1. **Quick setup**: Read `QUICK-START-AUTO.md`
2. **Detailed guide**: Read `README-SEEDING.md`
3. **Testing/debugging**: Read `TESTING.md`
4. **Error messages**: Check Troubleshooting section in `README-SEEDING.md`
5. **Still stuck**: Contact dev team

---

## 🎓 Learn More

- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Prisma Seeding Guide](https://www.prisma.io/docs/guides/database/seed-database)
- [AWS IAM Permissions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)

---

**Last Updated**: January 2025
**Version**: 2.0 (with AWS RDS Auto-Discovery)
**Status**: ✅ Production Ready
