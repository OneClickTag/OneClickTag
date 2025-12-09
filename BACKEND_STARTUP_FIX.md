# Backend Startup Fix - main.js Not Found

## Issue Summary
The backend container was failing to start with the error:
```
Error: Cannot find module '/app/backend/dist/main.js'
```

## Root Cause
The NestJS build process outputs compiled files to `dist/src/` directory, not directly to `dist/`. The CMD in the Dockerfile was pointing to the wrong path.

### Directory Structure
After `nest build`, the output is:
```
/app/backend/dist/
├── src/
│   ├── main.js          ← The actual entry point
│   ├── main.d.ts
│   ├── app.module.js
│   └── ... (other compiled files)
├── test/
└── tsconfig.tsbuildinfo
```

The CMD was trying to run `node dist/main.js` (which doesn't exist), instead of `node dist/src/main.js` (which does exist).

## The Fix

### File Changed
**`backend/Dockerfile`** (line 66)

**Before:**
```dockerfile
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
```

**After:**
```dockerfile
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main.js"]
```

## Verification

### Local Testing
```bash
# Build the Docker image
docker build -f backend/Dockerfile -t test-backend .

# Verify the file exists at the correct path
docker run --rm test-backend ls -la /app/backend/dist/src/main.js

# Expected output:
# -rw-r--r-- 1 root root 1199 Dec  8 15:47 /app/backend/dist/src/main.js
```

### Deployment Logs (Before Fix)
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "oneclicktag"
No migration found in prisma/migrations
No pending migrations to apply.
Error: Cannot find module '/app/backend/dist/main.js'
Node.js v18.20.8
```

The migrations ran successfully (proving database connectivity works), but then Node couldn't find the main.js file.

### Expected Logs (After Fix)
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "oneclicktag"
No migration found in prisma/migrations
No pending migrations to apply.
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [NestApplication] Nest application successfully started
```

## Next Steps

1. **Trigger Deployment**
   ```bash
   # Go to GitHub Actions
   # Run workflow: Deploy to AWS ECS
   # Select: backend, dev environment
   ```

2. **Monitor Deployment**
   ```bash
   # Watch ECS service events
   aws ecs describe-services \
     --cluster dev-api-cluster \
     --services dev-api-svc \
     --region eu-central-1 \
     --query 'services[0].events[0:5]'

   # Watch CloudWatch logs
   aws logs tail /ecs/dev/api --since 5m --region eu-central-1
   ```

3. **Verify Service is Running**
   ```bash
   # Check health endpoint
   curl https://dev-api.oneclicktag.com/health

   # Expected response:
   # {"status":"ok"}
   ```

## Additional Notes

### Why This Happened
- NestJS uses TypeScript compiler which outputs to `dist/src/` to mirror the source structure
- The standard NestJS starter template uses `nest start` command which handles this path automatically
- When running the compiled code directly with `node`, we need to specify the full path

### Alternative Solutions Considered

1. **Change tsconfig.json outDir** - Would require modifying the build configuration
2. **Use nest start in production** - Would add unnecessary overhead
3. **Symlink dist/main.js to dist/src/main.js** - Would add complexity to the Dockerfile

The chosen solution (updating the CMD) is the simplest and most maintainable.

## Commit Information
```
commit e530bc0
Author: Claude <noreply@anthropic.com>
Date: 2025-12-09

Fix backend Docker CMD path: use dist/src/main.js

The NestJS build outputs compiled files to dist/src/ directory,
not dist/ directly. Updated CMD to point to correct path.
```

## Related Issues
- ✅ ECR repository missing - FIXED
- ✅ Database URL encoding - FIXED
- ✅ Backend startup path - FIXED (this document)

## Status
✅ **FIXED** - Committed to master branch, ready for deployment
