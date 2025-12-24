# QA Review

Perform comprehensive quality assurance review of recent changes:

## Code Quality
- Review code structure and organization
- Check for code duplication
- Verify proper error handling patterns
- Check for unused imports, variables, or functions
- Verify proper TypeScript typing (no `any` without justification)
- Check for console.log statements that should be removed

## Best Practices Adherence
- Verify code follows agent guidelines from `.claude/agents/`
- Check NestJS patterns (services, controllers, modules)
- Verify React component patterns (hooks, state management)
- Check Prisma query optimization
- Verify proper async/await usage

## Business Logic
- Verify multi-tenant isolation is maintained
- Check that Google OAuth flows are correct
- Verify GTM workspace management follows "OneClickTag" workspace pattern
- Check tracking creation logic is sound
- Verify token refresh logic is proper

## Performance
- Check for N+1 query issues
- Verify proper pagination implementation
- Check for unnecessary database calls
- Verify proper use of Prisma relations
- Check for memory leaks in async operations

## UI/UX
- Verify error messages are user-friendly
- Check loading states are implemented
- Verify success feedback is shown
- Check responsive design considerations
- Verify accessibility basics (labels, ARIA where needed)

## Testing Coverage
- Identify areas lacking tests
- Check if critical paths have test coverage
- Verify test quality (not just coverage percentage)

## Documentation
- Check if complex logic has comments
- Verify API endpoints are clear
- Check if environment variables are documented

## Report Format
Provide findings categorized by:
1. **Bugs**: Issues that will cause failures
2. **Code Quality**: Areas needing refactoring
3. **Performance**: Optimization opportunities
4. **UX**: User experience improvements
5. **Testing**: Coverage gaps
6. **Documentation**: Missing or unclear docs

For each item:
- Location (file:line)
- Current state
- Recommended improvement
- Priority (High/Medium/Low)
