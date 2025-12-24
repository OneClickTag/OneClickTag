# Security Check

Perform a comprehensive security audit of the codebase:

## Multi-Tenant Security
- Verify all database queries include `tenantId` filtering
- Check that users can only access their organization's data
- Audit customer, tracking, and analytics endpoints for tenant isolation

## OAuth & Token Security
- Verify OAuth2Client is initialized with credentials (clientId, clientSecret)
- Check token storage uses encryption where needed
- Ensure refresh tokens are stored securely
- Verify tokens are never exposed in logs or error messages

## Authentication & Authorization
- Check Firebase authentication implementation
- Verify JWT token validation on backend
- Ensure protected routes require authentication
- Check role-based access control (RBAC) if implemented

## API Security
- Verify input validation on all endpoints
- Check for SQL injection vulnerabilities (Prisma protects most, but check raw queries)
- Verify CORS configuration is not overly permissive
- Check rate limiting is in place for sensitive endpoints

## Sensitive Data
- Scan for exposed API keys, tokens, or credentials in code
- Verify environment variables are used correctly
- Check .env files are in .gitignore
- Ensure Google OAuth credentials are never hardcoded

## OWASP Top 10
- Check for XSS vulnerabilities in frontend
- Verify CSRF protection where needed
- Check for insecure deserialization
- Verify secure headers are set

## Report Format
Provide findings in this format:
- **Critical**: Security issues requiring immediate fix
- **High**: Important security concerns
- **Medium**: Security improvements recommended
- **Low**: Minor security enhancements
- **Info**: Security best practices to consider

For each finding, include:
1. Location (file:line)
2. Issue description
3. Risk level
4. Recommended fix
