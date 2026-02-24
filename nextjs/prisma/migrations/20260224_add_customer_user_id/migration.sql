-- Step 1: Add nullable userId column
ALTER TABLE "customers" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill userId from createdBy where available
UPDATE "customers" SET "userId" = "createdBy" WHERE "createdBy" IS NOT NULL AND "createdBy" IN (SELECT "id" FROM "users");

-- Step 3: For customers where createdBy is null or not a valid user,
-- set userId to the first user in that tenant
UPDATE "customers" c
SET "userId" = (
  SELECT u."id" FROM "users" u WHERE u."tenantId" = c."tenantId" ORDER BY u."createdAt" ASC LIMIT 1
)
WHERE c."userId" IS NULL;

-- Step 4: Make userId required (will fail if any rows still have NULL - which means orphaned tenant)
ALTER TABLE "customers" ALTER COLUMN "userId" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add indexes
CREATE INDEX "customers_userId_idx" ON "customers"("userId");
CREATE INDEX "customers_userId_tenantId_idx" ON "customers"("userId", "tenantId");
