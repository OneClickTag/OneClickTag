# Test Pipeline

Execute comprehensive test pipeline and report results:

## 1. Type Checking
Run TypeScript compilation check:
- Backend: `cd backend && npx tsc --noEmit`
- Frontend: `cd frontend && npm run type-check` (if available) or `npx tsc --noEmit`

Report any type errors found.

## 2. Unit Tests
Run test suites:
- Backend: `cd backend && npm run test` or `npx jest`
- Frontend: `cd frontend && npm run test:unit` (if available)

Report:
- Total tests run
- Passed/Failed counts
- Failed test details
- Coverage percentage (if available)

## 3. Build Verification
Verify production builds succeed:
- Backend: Check if backend builds (usually built in Dockerfile)
- Frontend: `cd frontend && npm run build`

Report:
- Build success/failure
- Build time
- Bundle size (frontend)
- Any warnings during build

## 4. Linting (if configured)
Check code style:
- Run ESLint if configured
- Check for linting errors vs warnings

## 5. Database Schema Validation
Verify Prisma schema:
- Check for schema drift: `cd backend && pnpm prisma validate`
- Check if migrations are needed
- Verify schema consistency

## 6. Integration Test Recommendations
Identify critical flows that need integration tests:
- User authentication flow
- Customer creation and Google OAuth connection
- Tracking creation end-to-end
- Token refresh flow
- Multi-tenant data isolation

## 7. Test Coverage Analysis
Review test coverage:
- Identify untested services/components
- Highlight critical paths without tests
- Recommend priority test additions

## Report Format

### Summary
- ✅ Passed / ❌ Failed for each step
- Overall pipeline status
- Total execution time

### Details
For failures:
1. **Type Errors**: List with file:line
2. **Test Failures**: Test name, error message, stack trace
3. **Build Errors**: Error details and likely causes
4. **Schema Issues**: Drift or validation problems

### Recommendations
- Priority test additions needed
- Critical gaps in coverage
- Suggested test improvements

### Next Steps
Actionable items to fix any failures or improve test coverage.
