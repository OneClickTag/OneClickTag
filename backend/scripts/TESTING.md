# 🧪 Testing the RDS Seeding Scripts

## ✅ Compilation Tests

### TypeScript Compilation
```bash
# Should complete without errors
pnpm exec tsc --noEmit scripts/seed-rds.ts
```

**Expected Output**: No errors, silent success

---

## ✅ Script Execution Tests

### Test 1: Help Message (No Arguments)
```bash
pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts
```

**Expected Output**:
```
❌ Missing environment argument

Usage:
  pnpm seed:rds:<environment>
  OR
  pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts <environment>

Environments:
  - dev    : Development environment
  - stage  : Staging environment
  - prod   : Production environment

Examples:
  pnpm seed:rds:dev
  pnpm seed:rds:stage
  pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts prod
```

### Test 2: Invalid Environment
```bash
pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts invalid
```

**Expected Output**:
```
❌ Invalid environment: "invalid"

Valid environments: dev, stage, prod
```

### Test 3: Missing Database URL
```bash
# Make sure DEV_DATABASE_URL is NOT set
unset DEV_DATABASE_URL
pnpm seed:rds:dev
```

**Expected Output**:
```
❌ Database URL not found for dev environment.
Please set one of: DEV_DATABASE_URL, AWS_RDS_DEV_DATABASE_URL, DEV_DB_URL
```

### Test 4: Valid Environment with Database URL
```bash
# Set a test database URL
export DEV_DATABASE_URL="postgresql://user:pass@localhost:5432/testdb"
pnpm seed:rds:dev
```

**Expected Output**:
```
═══════════════════════════════════════════════════
🌱 Seeding DEV Database
═══════════════════════════════════════════════════

✅ Found database URL in DEV_DATABASE_URL
🔌 Testing database connection...
```

*(Then it will attempt to connect - may fail if DB doesn't exist, which is expected)*

---

## ✅ Shell Script Tests

### Test 1: Help Message
```bash
./scripts/seed-all-envs.sh --help
```

**Expected Output**: Full help documentation with usage examples

### Test 2: Prerequisites Check
```bash
./scripts/seed-all-envs.sh --env=dev
```

**Expected Output**:
```
═══════════════════════════════════════════════════
AWS RDS Database Seeding
═══════════════════════════════════════════════════

ℹ️  Checking prerequisites...
✅ Prerequisites check passed

═══════════════════════════════════════════════════
Seeding DEV Environment
═══════════════════════════════════════════════════
```

### Test 3: Missing AWS Credentials
```bash
unset AWS_ACCESS_KEY_ID
./scripts/seed-all-envs.sh --env=dev
```

**Expected Output**:
```
ℹ️  Checking prerequisites...
❌ AWS_ACCESS_KEY_ID is not set
```

---

## ✅ NPM Script Tests

### Test 1: Individual Environment Scripts
```bash
pnpm seed:rds:dev --help
# OR just run without args to see error
pnpm seed:rds:dev
```

### Test 2: All Environments Script
```bash
./scripts/seed-all-envs.sh --help
```

---

## 🔍 Manual Verification Checklist

### Files Created
- [ ] `backend/scripts/seed-rds.ts` exists
- [ ] `backend/scripts/seed-all-envs.sh` exists and is executable (`chmod +x`)
- [ ] `backend/scripts/README-SEEDING.md` exists
- [ ] `backend/scripts/QUICK-START.md` exists
- [ ] `backend/scripts/TESTING.md` exists (this file)
- [ ] `backend/.env.example` updated with AWS variables

### TypeScript Compilation
- [ ] `pnpm exec tsc --noEmit scripts/seed-rds.ts` passes
- [ ] No import errors
- [ ] No type errors

### Script Permissions
- [ ] `ls -la scripts/seed-all-envs.sh` shows executable bit (e.g., `-rwxr-xr-x`)

### Package.json Scripts
- [ ] `"seed:rds:dev"` exists in scripts
- [ ] `"seed:rds:stage"` exists in scripts
- [ ] `"seed:rds:prod"` exists in scripts
- [ ] `"seed:rds:all"` exists in scripts

### Environment Variables
- [ ] `.env.example` has `AWS_ACCESS_KEY_ID`
- [ ] `.env.example` has `AWS_SECRET_ACCESS_KEY`
- [ ] `.env.example` has `DEV_DATABASE_URL`
- [ ] `.env.example` has `STAGE_DATABASE_URL`
- [ ] `.env.example` has `PROD_DATABASE_URL`

---

## 🎯 Integration Test (Safe, No Real Seeding)

This test verifies the entire flow without actually seeding:

```bash
# 1. Set test environment variables
export AWS_ACCESS_KEY_ID="test-key"
export AWS_SECRET_ACCESS_KEY="test-secret"
export DEV_DATABASE_URL="postgresql://test:test@localhost:5432/test"

# 2. Run script (will fail at DB connection, which is expected)
pnpm seed:rds:dev
```

**Expected Output**:
- ✅ Script starts
- ✅ Finds AWS credentials
- ✅ Finds database URL
- ❌ Fails at database connection (expected - no real DB)

This confirms the script structure is correct!

---

## 🚀 Real Seeding Test (When Ready)

**Only run this when you have real AWS credentials and database URLs!**

```bash
# 1. Set real environment variables in .env
cat >> .env << EOF
AWS_ACCESS_KEY_ID=your-real-key
AWS_SECRET_ACCESS_KEY=your-real-secret
DEV_DATABASE_URL=postgresql://user:pass@dev-rds.region.rds.amazonaws.com:5432/db
EOF

# 2. Test with dev first (safest)
pnpm seed:rds:dev

# 3. If successful, try stage
pnpm seed:rds:stage

# 4. Finally, prod (with extreme caution)
pnpm seed:rds:prod
```

**Expected Output**:
```
═══════════════════════════════════════════════════
🌱 Seeding DEV Database
═══════════════════════════════════════════════════

✅ Found database URL in DEV_DATABASE_URL
🔌 Testing database connection...
✅ Database connection successful

🔍 Checking if database is already seeded...
✅ Database is empty, ready for seeding

🌱 Running seed script...

🌱 Seeding database...
✅ Created admin user: admin@oneclicktag.com
✅ Created content pages: about terms privacy
✅ Created plans: Starter Professional Enterprise
✅ Created landing page content: hero features cta
✅ Created site settings
✅ Created contact page content
🎉 Seeding complete!

═══════════════════════════════════════════════════
✅ DEV Database Seeded Successfully
═══════════════════════════════════════════════════

📋 Seeded data includes:
   ✓ Admin user (admin@oneclicktag.com)
   ✓ Content pages (About, Terms, Privacy)
   ✓ Pricing plans (Starter, Pro, Enterprise)
   ✓ Landing page content (Hero, Features, CTA)
   ✓ Site settings (Branding, Colors, Meta)
   ✓ Contact page content
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module"
```bash
# Solution: Install dependencies
cd backend
pnpm install
```

### Issue: "Permission denied: ./scripts/seed-all-envs.sh"
```bash
# Solution: Make script executable
chmod +x scripts/seed-all-envs.sh
```

### Issue: TypeScript compilation errors
```bash
# Solution: Regenerate Prisma client
pnpm prisma generate

# Then recompile
pnpm exec tsc --noEmit scripts/seed-rds.ts
```

### Issue: "ts-node: command not found"
```bash
# Solution: Use pnpm exec
pnpm exec ts-node -r tsconfig-paths/register scripts/seed-rds.ts dev
# OR install ts-node
pnpm add -D ts-node
```

---

## ✅ All Tests Passed Checklist

- [ ] TypeScript compiles without errors
- [ ] Help messages display correctly
- [ ] Error handling works (invalid env, missing vars)
- [ ] Shell script is executable
- [ ] NPM scripts are registered
- [ ] Environment variables are documented
- [ ] (Optional) Real seeding test successful

---

**Created**: January 2025
**Purpose**: Verification and testing guide
**Next Steps**: Run through this checklist to verify everything works!
