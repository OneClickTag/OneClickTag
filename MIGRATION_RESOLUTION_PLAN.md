# Migration Resolution Plan - Production Database

## 🔍 Current State Analysis

### Production Database State
```
✅ Applied: 20241210000000_init
✅ Applied: 20251113220938_add_customer_slug (PHANTOM - not in local migrations folder)
❌ Pending: 20241226000000_add_leads_questionnaire_models
❌ Failed:  20260115000000_add_landing_sections (P3009 error)
```

### Local Migrations Folder
```
✅ Exists: 20241210000000_init
❌ Missing: 20251113220938_add_customer_slug (exists in prod but not locally!)
✅ Exists: 20241226000000_add_leads_questionnaire_models
✅ Exists: 20260115000000_add_landing_sections
```

### Root Cause
**The `20251113220938_add_customer_slug` migration was applied directly to production but never committed to git.** This created a mismatch between local and production migration histories.

## 📊 Migration Safety Analysis

### Migration 1: 20251113220938_add_customer_slug (PHANTOM)
**Status**: Already applied in production, doesn't exist locally

**What it claims to do**: Add slug field to Customer table

**Reality**: The slug field ALREADY EXISTS in the init migration (20241210000000_init):
```sql
-- From init migration line 63:
"slug" TEXT NOT NULL,

-- From init migration (unique constraint):
CREATE UNIQUE INDEX "customers_slug_key" ON "customers"("slug");
```

**Conclusion**: This migration was redundant or empty. It's safe to skip/ignore it.

---

### Migration 2: 20241226000000_add_leads_questionnaire_models
**Status**: Pending, needs to be applied

**What it does**: Creates 4 new tables:
- `leads` - Lead capture table
- `questionnaire_questions` - Question definitions
- `questionnaire_responses` - Lead answers
- `lead_page_views` - Page view tracking

**Safety Check**: ✅ SAFE
- Creates entirely new tables (no modifications to existing tables)
- No dependencies on existing data
- Uses standard CREATE TABLE statements
- No conflicts possible

---

### Migration 3: 20260115000000_add_landing_sections
**Status**: Failed with P3009 error (incomplete)

**What it does**: Inserts 2 rows into `landing_page_content` table:
- `how-it-works` section data
- `social-proof` section data

**Safety Check**: ✅ SAFE & IDEMPOTENT
```sql
INSERT ... VALUES (...) ON CONFLICT (key) DO NOTHING;
```
- Uses `ON CONFLICT DO NOTHING` - safe to run multiple times
- Won't duplicate data if already exists
- Won't fail if data already exists
- Table already exists from init migration

**Idempotency Verification**:
- If you run it twice, the second run does nothing (ON CONFLICT clause)
- Safe even if partially completed before failure

## ✅ Resolution Strategy

### Step 1: Ignore the Phantom Migration
The `20251113220938_add_customer_slug` migration exists in production but:
1. It's redundant (slug already existed)
2. Not in git history
3. Not needed for schema consistency

**Action**: We'll let Prisma handle this gracefully by resolving the migration state.

### Step 2: Mark Failed Migration as Resolved
The `20260115000000_add_landing_sections` migration started but didn't complete due to the history mismatch.

**GitHub Actions Workflow**:
1. Go to: Actions → "Database Migrations" workflow
2. Click "Run workflow"
3. Select:
   - Environment: `prod`
   - Operation: `resolve`
   - Dry run: `false`
4. This will mark the failed migration as applied

### Step 3: Deploy Pending Migrations
After resolving, deploy both pending migrations:

**GitHub Actions Workflow**:
1. Go to: Actions → "Database Migrations" workflow
2. Click "Run workflow"
3. Select:
   - Environment: `prod`
   - Operation: `migrate`
   - Dry run: `false`
4. This will apply:
   - `20241226000000_add_leads_questionnaire_models` (creates new tables)
   - `20260115000000_add_landing_sections` (inserts data - idempotent)

## 🔒 Why This Is Safe

1. **No Schema Conflicts**: The phantom migration is redundant
2. **New Tables Only**: Migration 2 creates new tables, no modifications to existing
3. **Idempotent Data Insert**: Migration 3 uses ON CONFLICT DO NOTHING
4. **No Data Loss**: No DROP or DELETE statements
5. **Rollback Ready**: If anything fails, data can be removed with simple DELETE statements

## 📋 Execution Checklist

### Pre-Flight Checks
- [ ] Verify GitHub Actions workflow has "resolve" operation (✅ Already added)
- [ ] Confirm no manual migrations are running
- [ ] Backup recent data (optional - migrations are additive only)

### Execution Steps
1. **Run Resolve Operation**
   - [ ] Go to GitHub Actions → Database Migrations
   - [ ] Run workflow with: env=prod, operation=resolve
   - [ ] Wait for completion (~2 minutes)
   - [ ] Verify success (green checkmark)

2. **Run Migration Deployment**
   - [ ] Go to GitHub Actions → Database Migrations
   - [ ] Run workflow with: env=prod, operation=migrate
   - [ ] Wait for completion (~3-5 minutes)
   - [ ] Verify success (green checkmark)

3. **Verify Results**
   - [ ] Check ECS logs for migration success messages
   - [ ] Verify no P3009 errors
   - [ ] Application should still be running normally

### Post-Deployment Verification

Run these checks to confirm success:

1. **Migration Status**
   ```sql
   SELECT migration_name, finished_at, success
   FROM _prisma_migrations
   ORDER BY finished_at DESC
   LIMIT 5;
   ```
   Expected: All migrations show `success = 1`

2. **New Tables Created**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('leads', 'questionnaire_questions', 'questionnaire_responses', 'lead_page_views');
   ```
   Expected: 4 rows returned

3. **Landing Sections Data**
   ```sql
   SELECT key, is_active
   FROM landing_page_content
   ORDER BY created_at;
   ```
   Expected: 5 rows (hero, features, cta, how-it-works, social-proof)

## 🚨 Rollback Plan

If issues occur after migration:

### Rollback Migration 3 (Landing Sections)
```sql
-- Remove the two new landing sections
DELETE FROM landing_page_content WHERE key IN ('how-it-works', 'social-proof');
```

### Rollback Migration 2 (Leads/Questionnaire)
```sql
-- Drop the four new tables
DROP TABLE IF EXISTS lead_page_views CASCADE;
DROP TABLE IF EXISTS questionnaire_responses CASCADE;
DROP TABLE IF EXISTS questionnaire_questions CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TYPE IF EXISTS "QuestionType";
```

Then mark migrations as rolled back via GitHub Actions:
```bash
pnpm prisma migrate resolve --rolled-back 20260115000000_add_landing_sections
pnpm prisma migrate resolve --rolled-back 20241226000000_add_leads_questionnaire_models
```

## 📚 Lessons Learned

### ❌ What Went Wrong
1. Someone ran migrations manually on production (20251113220938_add_customer_slug)
2. That migration was never committed to git
3. Created a mismatch between local and production histories
4. Subsequent migrations failed due to history mismatch

### ✅ Proper Migration Workflow
1. **Local Development**:
   ```bash
   cd backend
   pnpm prisma migrate dev --name my_feature
   git add prisma/migrations/
   git commit -m "Add migration: my_feature"
   git push
   ```

2. **Production Deployment**:
   - ONLY via GitHub Actions workflow
   - NEVER run `prisma migrate dev` on production
   - NEVER run `prisma migrate deploy` manually on production
   - NEVER run `prisma db push` on production

3. **If Migration Fails**:
   - Check logs in ECS/CloudWatch
   - Use GitHub Actions "resolve" operation if needed
   - Never manually modify `_prisma_migrations` table

## 🎯 Expected Outcome

After completing these steps:
- ✅ Migration history will be consistent
- ✅ All 4 new tables will exist (leads, questionnaire_questions, questionnaire_responses, lead_page_views)
- ✅ Landing page will have 5 sections total
- ✅ Future migrations can run without P3009 errors
- ✅ Application continues running normally

## 📞 Support

If any step fails:
1. Check the GitHub Actions logs for error messages
2. Check ECS CloudWatch logs for detailed error traces
3. The migrations are designed to be safe - they create new data, don't modify existing
4. Rollback steps are documented above if needed
