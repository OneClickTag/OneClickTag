- NOTE: You can't need to Start frontend and backend dev servers to test because they running on other bash. use them instead running you own bashs

# ⚠️ CRITICAL: Mandatory Agent Usage Protocol

## 🚨 ENFORCEMENT RULES - NO EXCEPTIONS 🚨

**Claude Code MUST follow this protocol for EVERY task. Failure to do so will result in incorrect implementations.**

### Rule 1: **AGENT FILES ARE MANDATORY, NOT OPTIONAL**

Before writing ANY code or making ANY changes:

1. ✅ **STOP** - Don't start coding immediately
2. ✅ **IDENTIFY** - What domain does this task belong to?
3. ✅ **READ** - Open and read the relevant agent file(s) from `.claude/agents/`
4. ✅ **APPLY** - Use the patterns, rules, and best practices from the agent
5. ✅ **CODE** - Now implement following the agent's guidelines

**This is NOT a suggestion. This is a requirement.**

### Rule 2: **Agent Reading is ALWAYS the First Step**

```
❌ WRONG WORKFLOW:
User: "Fix the GTM workspace issue"
→ Claude immediately starts editing google-integration.service.ts
→ Makes changes without context
→ Violates best practices from Google Agent

✅ CORRECT WORKFLOW:
User: "Fix the GTM workspace issue"
→ Claude: "I'll read the Google Agent file first"
→ Reads .claude/agents/google.md
→ Sees GTM workspace management patterns
→ Sees OAuth client initialization requirements
→ Applies those patterns while fixing
→ Success!
```

### Rule 3: **Acknowledge Agent Usage in Your Response**

When starting a task, you MUST explicitly state which agent(s) you're using:

```
✅ "I'll use the Google Agent to help with this GTM integration..."
✅ "Reading the Campaigner Agent for tracking strategy..."
✅ "Applying patterns from Backend Agent and Database Agent..."
```

This ensures you're actually reading and using the agent files.

### Rule 4: **Task-to-Agent Mapping**

When you start ANY task, you MUST:

1. **Identify the domain** (backend, frontend, Google APIs, campaign analysis, etc.)
2. **Read the relevant agent file(s)** from `.claude/agents/`
3. **Apply the patterns and rules** from that agent
4. **Follow the agent's best practices**

**If you're unsure which agent to use, read the trigger table below.**

### Rule 5: **Automatic Agent Activation Triggers**

| Working On | Read This Agent | File Path |
|---|---|---|
| `backend/src/**/*.ts` | Backend Agent | `.claude/agents/backend.md` |
| `google-integration.service.ts` | Google Agent | `.claude/agents/google.md` |
| `frontend/src/**/*.tsx` | Frontend Agent | `.claude/agents/frontend.md` |
| Prisma schema or migrations | Database Agent | `.claude/agents/database.md` |
| OAuth or security features | Security Agent | `.claude/agents/security.md` |
| Website tracking analysis | Campaigner Agent | `.claude/agents/campaigner.md` |
| Tracking point identification | Campaigner Agent | `.claude/agents/campaigner.md` |
| Campaign site crawling | Crawler Agent + Campaigner Agent | `.claude/agents/crawler.md` + `.claude/agents/campaigner.md` |
| Selector generation for tracking | Crawler Agent + Campaigner Agent | `.claude/agents/crawler.md` + `.claude/agents/campaigner.md` |

### Rule 6: **Multi-Agent Tasks Require Reading ALL Agents**

Some tasks require multiple agents. You MUST read ALL applicable agents:

**Example - Campaign Site Analysis with Implementation**:
```
Task: "Analyze this e-commerce site and create tracking for checkout flow"

Required Agents:
1. Campaigner Agent - Identify conversion points
2. Crawler Agent - Generate CSS selectors
3. Google Agent - Create GTM tags/triggers
4. Backend Agent - Implement API endpoints

Process:
→ Read all 4 agent files
→ Campaigner: Identify checkout steps (cart, shipping, payment, confirmation)
→ Crawler: Generate selectors for each button/form
→ Google: Create GTM trigger/tag configurations
→ Backend: Create tracking endpoint with proper structure
→ Implement with all best practices applied
```

**Never skip reading an agent because you "think you know how to do it."**

---

## Agent Usage Examples

### Example 1: Correct Agent Usage

**WRONG ❌**:
```
User: Fix the GTM workspace issue
Claude: Let me update google-integration.service.ts...
[Makes changes without reading agent file]
```

**CORRECT ✅**:
```
User: Fix the GTM workspace issue
Claude: I'll read the Google agent file first to follow best practices.
[Reads .claude/agents/google.md]
[Sees rules about workspace paths, OAuth client initialization, etc.]
[Applies those patterns while fixing the issue]
```

### Example 2: Multi-Agent Complex Tasks

**Common Multi-Agent Scenarios**:

| Task Type | Required Agents | Why |
|---|---|---|
| **GTM Tag Creation** | `google.md` + `backend.md` | GTM API patterns + NestJS service structure |
| **Customer Connection UI** | `frontend.md` + `backend.md` | React components + API integration |
| **Database Schema Changes** | `database.md` + `backend.md` | Schema design + Prisma best practices |
| **Campaign Site Analysis** | `campaigner.md` + `crawler.md` | Conversion strategy + Selector generation |
| **Full Tracking Implementation** | `campaigner.md` + `crawler.md` + `google.md` + `backend.md` | Strategy + Selectors + GTM + API |
| **Secure OAuth Flow** | `google.md` + `security.md` + `backend.md` | OAuth API + Security + Implementation |

**You must read ALL listed agents for these tasks.**

---

# OneClickTag - AI Agent Definitions

## Agent Roles & Expertise

### 1. Frontend Agent (@frontend)
**Expertise**: React, TypeScript, Vite, Shadcn UI, Tailwind CSS, Frontend Architecture
**Responsibilities**:
- Build and maintain React components using TypeScript
- Implement UI/UX using Shadcn UI and Tailwind CSS
- Handle state management and React hooks
- Integrate with backend APIs
- Optimize bundle size and performance with Vite
- Implement responsive designs
- Handle form validation and user interactions
- Debug frontend issues and browser compatibility

**Key Focus Areas**:
- Component architecture and reusability
- Type safety with TypeScript
- CSS styling with Tailwind
- Client-side routing and navigation
- Real-time UI updates for tracking creation
- Data grid implementation (pagination, sorting, filtering)

### 2. Backend Agent (@backend)
**Expertise**: NestJS, Node.js, TypeScript, PostgreSQL, Prisma ORM, REST APIs
**Responsibilities**:
- Design and implement NestJS services, controllers, and modules
- Create and maintain database schemas with Prisma
- Write database migrations and queries
- Implement business logic and validation
- Handle error management and logging
- Optimize database performance
- Create API endpoints following REST best practices
- Implement background jobs and async processing

**Key Focus Areas**:
- Multi-tenant architecture implementation
- OAuth token management and refresh logic
- Transaction handling for complex operations
- Database indexing and query optimization
- API versioning and documentation
- Job queues for Google API sync operations

### 3. Google Specialist Agent (@google)
**Expertise**: Google Tag Manager API, Google Ads API, Google Analytics 4, OAuth 2.0, Google Cloud
**Responsibilities**:
- Integrate with Google Tag Manager API (containers, tags, triggers, variables)
- Integrate with Google Ads API (conversion actions, campaigns)
- Implement Google Analytics 4 tracking setup
- Handle OAuth 2.0 flows and token management
- Manage Google API rate limits and quotas
- Troubleshoot Google API errors and validation issues
- Create optimal GTM tag configurations
- Implement conversion tracking best practices

**Key Focus Areas**:
- GTM workspace and version management
- Creating tags, triggers, and variables programmatically
- Google Ads conversion action creation and linking
- GA4 event configuration and custom dimensions
- OAuth consent screen and scope management
- Google API batch operations for efficiency
- Handling API deprecations and version updates

### 4. Crawler/Scraper Agent (@crawler)
**Expertise**: Web scraping, Puppeteer/Playwright, DOM manipulation, CSS selectors, Browser automation
**Responsibilities**:
- Implement intelligent website crawling for user sites
- Extract relevant tracking elements (buttons, forms, links)
- Generate accurate CSS selectors for tracking targets
- Identify page URLs and navigation patterns
- Handle dynamic content and SPAs
- Detect form fields and submission flows
- Extract metadata for tracking configuration
- Handle various website structures and frameworks

**Key Focus Areas**:
- Headless browser automation
- Smart selector generation (fallback strategies)
- Handling authentication walls and redirects
- Performance optimization for large sites
- Detecting and avoiding bot protection
- Extracting structured data from pages
- Identifying tracking opportunities automatically

### 5. Security Agent (@security)
**Expertise**: OAuth security, OWASP best practices, Data encryption, Authentication & Authorization, GDPR compliance
**Responsibilities**:
- Review and secure OAuth implementations
- Ensure proper token storage and encryption
- Implement role-based access control (RBAC)
- Audit multi-tenant data isolation
- Review API security (rate limiting, validation)
- Ensure GDPR and privacy compliance
- Implement secure credential management
- Security testing and vulnerability scanning

**Key Focus Areas**:
- OAuth 2.0 security flows (PKCE, state validation)
- JWT token management and validation
- Firebase authentication security
- Google API credential protection
- SQL injection prevention
- XSS and CSRF protection
- Secure environment variable handling
- Multi-tenant data segregation

### 6. Database Architect Agent (@database)
**Expertise**: PostgreSQL, Prisma ORM, Database design, Query optimization, Indexing strategies
**Responsibilities**:
- Design efficient database schemas
- Optimize Prisma queries and relations
- Create and manage database migrations
- Implement indexing strategies
- Handle data consistency and integrity
- Design multi-tenant database architecture
- Optimize complex queries
- Plan database scaling strategies

**Key Focus Areas**:
- Multi-tenant schema design (shared vs isolated)
- Efficient relation modeling for Prisma
- Query performance optimization
- Handling large datasets (pagination, cursors)
- Audit logging and data history
- Backup and recovery strategies

### 7. DevOps Agent (@devops)
**Expertise**: Vercel deployment, CI/CD, Environment management, Monitoring, Docker
**Responsibilities**:
- Configure Vercel deployment pipelines
- Set up environment variables across environments
- Implement CI/CD workflows
- Monitor application performance
- Handle database migrations in production
- Configure logging and error tracking
- Manage secrets and credentials
- Optimize build and deploy processes

**Key Focus Areas**:
- Vercel configuration for monorepo/full-stack apps
- Environment-specific builds (dev, staging, prod)
- Database migration automation
- Monitoring and alerting setup
- Log aggregation and analysis
- Performance monitoring and optimization

### 8. Testing Agent (@testing)
**Expertise**: Jest, React Testing Library, E2E testing, API testing, Test automation
**Responsibilities**:
- Write unit tests for frontend components
- Write unit tests for backend services
- Create integration tests for API endpoints
- Implement E2E tests for critical flows
- Test Google API integrations with mocks
- Ensure test coverage meets standards
- Implement test automation in CI/CD
- Write testable code patterns

**Key Focus Areas**:
- Testing React components with user interactions
- Mocking Google APIs for testing
- Testing OAuth flows
- Database testing with Prisma
- Testing multi-tenant isolation
- Performance testing for crawling operations

### 9. Analytics Agent (@analytics)
**Expertise**: Data visualization, Analytics implementation, Metrics tracking, Reporting
**Responsibilities**:
- Design analytics dashboard features
- Implement usage tracking and metrics
- Create data visualizations and charts
- Design reporting queries
- Optimize analytics performance
- Implement real-time analytics updates
- Create business intelligence insights

**Key Focus Areas**:
- Customer usage analytics
- Tracking success/failure metrics
- System-wide performance metrics
- Conversion funnel analysis
- Chart and graph implementations
- Real-time data updates

### 10. Architecture Agent (@architect)
**Expertise**: System design, Scalability, Design patterns, Technical documentation
**Responsibilities**:
- Design overall system architecture
- Make technology stack decisions
- Plan feature implementations
- Design API contracts
- Create technical documentation
- Ensure code maintainability
- Review architectural decisions
- Plan scalability strategies

**Key Focus Areas**:
- Microservices vs monolith decisions
- API design and versioning
- Caching strategies
- Queue systems for background jobs
- Real-time communication architecture
- Multi-tenant architecture patterns

### 11. Campaigner Agent (@campaigner)
**Expertise**: Marketing campaign analysis, Conversion tracking, Campaign site analysis, Tracking strategy
**Responsibilities**:
- Analyze marketing campaign websites and landing pages
- Identify conversion points and micro-conversions
- Map out complete user journeys and conversion funnels
- Recommend optimal tracking placements for ROI measurement
- Design event tracking taxonomies and naming conventions
- Identify cross-domain and multi-step tracking requirements
- Analyze e-commerce, lead gen, SaaS, and content campaigns
- Recommend tracking strategies for specific campaign goals

**Key Focus Areas**:
- Conversion point identification (CTAs, forms, checkouts)
- Campaign type analysis (e-commerce, lead gen, SaaS, content)
- User journey mapping and funnel analysis
- Event naming conventions (Category_Action_Label)
- Value tracking for ROI measurement
- Multi-step form and checkout flow tracking
- Mobile-specific tracking patterns
- A/B testing and personalization tracking

## How to Use Agent Expertise

The agent files in `.claude/agents/` serve as **context and expertise references** for Claude. When working on specific tasks, Claude should:

1. **Reference Agent Expertise**: Read the relevant agent file to understand best practices
2. **Apply Specialized Knowledge**: Use the patterns and guidelines from the agent
3. **Follow Agent Standards**: Implement code following the agent's recommendations

### Example Workflow

When implementing GTM features:
```
1. Read `.claude/agents/google.md` for GTM API patterns
2. Apply the tag creation best practices
3. Use the error handling patterns shown
4. Follow the OAuth token management guidelines
```

### Agent Files Available

- `/google.md` - Google APIs (GTM, Ads, GA4, OAuth)
- `/frontend.md` - React, TypeScript, UI components
- `/backend.md` - NestJS, Prisma, API design
- `/database.md` - PostgreSQL, schema design, optimization
- `/security.md` - OAuth security, OWASP, data protection
- `/crawler.md` - Web scraping, selector generation
- `/campaigner.md` - Campaign analysis, conversion tracking strategy
- `/testing.md` - Jest, E2E testing, test patterns
- `/devops.md` - Vercel deployment, CI/CD
- `/analytics.md` - Data visualization, metrics
- `/architect.md` - System design, scalability

### When Working on Features

**Before implementing**:
1. Identify which agent expertise is relevant
2. Read the agent file(s) for context
3. Apply the patterns and best practices
4. Follow the coding standards

**For complex tasks requiring multiple areas**:
- Read multiple agent files as needed
- Combine their expertise
- Follow patterns from each domain

**Examples**:
- Creating GTM tracking → Read `google.md` for GTM patterns
- Building React form → Read `frontend.md` for component patterns
- Database optimization → Read `database.md` for query optimization
- OAuth implementation → Read both `google.md` and `security.md`
- Analyzing campaign site → Read `campaigner.md` for tracking strategy
- Implementing site crawler → Read both `crawler.md` and `campaigner.md`
- Creating tracking recommendations → Read `campaigner.md` + `google.md` + `backend.md`

# OneClickTag - System Features & Abilities

## Project Overview

OneClickTag is a SaaS platform that simplifies Google tracking setup for marketing campaigners. It automates the complex process of creating tracking tags in Google Tag Manager and Google Ads.

## Tech Stack

- Backend: NestJS, TypeScript, PostgreSQL, Prisma ORM
- Frontend: Vite, React, TypeScript, Shadcn UI, Tailwind CSS
- Auth: Firebase (email/password + Google SSO)
- APIs: Google Tag Manager, Google Ads
- Deployment: Vercel

## System Abilities

### 1. User Authentication

- Sign up/login with email & password
- Google SSO login
- Multi-tenant support (each user belongs to an organization)

### 2. Customer Management

- Create, edit, delete customers
- Store customer website URL and name
- Connect customer to Google account via OAuth
- View all customers in paginated grid with search, sort, and filter
- Bulk delete customers
- See customer connection status with Google

### 3. Google Account Integration

- Connect each customer to their Google account
- Automatic access to Google Tag Manager containers
- Automatic access to Google Ads account
- Store and auto-refresh OAuth tokens
- Create GTM variables automatically on connection

### 4. Tracking Creation (Main Feature)

- Create tracking with minimal input:
  - Just select tracking type (button click, page view, form submit)
  - Enter CSS selector or URL pattern
  - System handles all the complexity
- Automatically creates in background:
  - GTM trigger
  - GTM tag
  - Google Ads conversion action
  - Links everything together

### 5. Tracking Management

- View all trackings for each customer
- See tracking sync status (success/failed)
- Delete trackings (single or bulk)
- View tracking configuration details
- See error messages if sync failed

### 6. Analytics & Monitoring

- Customer usage analytics (how many trackings, success rate)
- System-wide analytics for all customers
- Track which customers are active
- Monitor Google API sync status

### 7. Real-time Updates

- Live status updates when creating trackings
- Real-time sync progress indicators
- Instant error notifications

## Page Structure

### `/AllCustomers` Page

Two tabs:

1. **Customer Analytics** - Usage statistics and graphs
2. **All Customers** - List of all customers with management options

### `/customer/{customerName}` Page

Four tabs:

1. **Settings** - Customer info and Google connection
2. **Customer Analytics** - Specific customer usage data
3. **Current Trackings** - List of all trackings with status
4. **Create New Track** - Simple form to create new tracking

## Key Business Rules

1. Customer must connect Google account before creating trackings
2. System automatically handles all GTM complexity - user never sees GTM interface
3. All trackings are synced to both GTM and Google Ads
4. Failed syncs show clear error messages
5. Multi-tenant - users only see their organization's data

## Main User Flow

1. User signs up/logs in
2. Creates a customer (website they're tracking)
3. Connects customer to Google account
4. Creates trackings with simple form
5. System automatically sets up everything in GTM and Google Ads
6. User monitors tracking status and analytics

## Unique Selling Points

- **Simplicity**: No GTM knowledge required
- **Automation**: Creates tags, triggers, and conversions automatically
- **Speed**: What takes 30 minutes manually takes 2 minutes here
- **Error Prevention**: Validates everything before creating
- **Monitoring**: See all trackings status in one place

---

# Implementation Reference

## Google OAuth & GTM Setup

### OAuth Integration (Fully Implemented ✅)

When a customer connects their Google account:

1. **OAuth Scopes Requested**:
   ```
   - userinfo.email, userinfo.profile
   - adwords (Google Ads)
   - tagmanager.manage.accounts, tagmanager.edit.containers, tagmanager.publish
   - analytics.edit, analytics.readonly (GA4)
   ```

2. **Token Storage**:
   - 3 separate token records stored: `ads`, `gtm`, `ga4`
   - Tokens auto-refresh when expired
   - OAuth2Client MUST be initialized with client credentials:
   ```typescript
   const oauth2Client = new google.auth.OAuth2(
     clientId, clientSecret, callbackUrl
   );
   ```

3. **Automatic Syncing** (Non-blocking):
   - Google Ads accounts fetched and stored
   - GA4 properties fetched and stored
   - GTM essentials automatically set up

### GTM Workspace Management (Fully Implemented ✅)

**Critical Rule**: All GTM operations use the dedicated "OneClickTag" workspace

**Implementation** (`google-integration.service.ts:733-773`):
```typescript
private async getOrCreateWorkspace(gtmClient, containerId): Promise<string> {
  // Lists existing workspaces
  // Finds workspace named 'OneClickTag'
  // If exists → returns its ID
  // If not exists → creates it
  return workspaceId;
}
```

**What Gets Created in OneClickTag Workspace**:
- ✅ Conversion Linker tag (Google Ads tracking)
- ✅ All Pages trigger (fires on every page)
- ✅ 3 Custom variables (Page Title, Scroll Depth, User ID)
- ✅ Built-in variables (documented, auto-enable when used)

**Path Format** (CRITICAL):
```typescript
// ✅ CORRECT - Use specific workspace ID
parent: `accounts/-/containers/${containerId}/workspaces/${workspaceId}`

// ❌ WRONG - Don't use default workspace wildcard
parent: `accounts/-/containers/${containerId}/workspaces/-`
```

**Benefits**:
- All OneClickTag changes isolated in one workspace
- Easy to see what OneClickTag created vs. manual changes
- User can review and publish OneClickTag workspace separately
- No interference with Default workspace

### Token Refresh Pattern (CRITICAL)

**Always initialize OAuth2Client properly**:
```typescript
// ✅ CORRECT
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
oauth2Client.setCredentials({
  access_token: tokens.accessToken,
  refresh_token: tokens.refreshToken,
});

// Token refresh will work automatically
```

**Make external API calls non-blocking**:
```typescript
try {
  await this.syncGA4Properties(customerId);
} catch (error) {
  this.logger.warn('GA4 sync failed. Continuing...');
  // Don't throw - connection should still succeed
}
```

## Authentication Persistence (Fully Implemented ✅)

### Frontend Token Management

**File**: `frontend/src/lib/api/auth/tokenManager.ts`

**Features**:
- ✅ Saves tokens to localStorage on login
- ✅ Loads tokens from localStorage on initialization
- ✅ Validates token structure before restoring
- ✅ Checks expiration (5-minute buffer)
- ✅ Auto-refreshes tokens before expiration
- ✅ Syncs across browser tabs

**Storage Key**: `oneclicktag_auth_tokens`

**Restoration Flow**:
```
Page Load → TokenManager loads from localStorage
         → Firebase restores session (IndexedDB)
         → onAuthStateChanged fires
         → If user exists → authenticateWithBackend()
         → User stays logged in ✅
```

### Firebase Integration

**File**: `frontend/src/lib/firebase/authService.ts`

- Firebase session persists in IndexedDB automatically
- `onAuthStateChanged` detects restored sessions
- Automatically re-authenticates with backend on page load

## Database Schema

### Key Models

**GA4Property**:
```prisma
model GA4Property {
  id              String   @id @default(cuid())
  googleAccountId String
  propertyId      String   // GA4 property ID
  propertyName    String
  measurementId   String?  // G-XXXXXXXXXX
  isActive        Boolean  @default(true)
  customerId      String
  customer        Customer @relation(...)
  tenantId        String

  @@unique([propertyId, tenantId])
}
```

**Customer Relations**:
- Has many: trackings, googleAdsAccounts, ga4Properties
- Belongs to: tenant/organization

## Environment Variables Required

```bash
# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=xxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/oneclicktag
```

## Error Handling Patterns

### Safe Error Extraction (Backend)
```typescript
catch (error) {
  const errorMessage = error?.message || String(error) || 'Unknown error';
  this.logger.error(`Operation failed: ${errorMessage}`, error?.stack);
  throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
}
```

### Multi-Tenant Security (CRITICAL)
```typescript
// ✅ CORRECT - Always filter by tenantId
const customers = await this.prisma.customer.findMany({
  where: { tenantId },
});

// ❌ WRONG - Exposes other tenants' data
const customers = await this.prisma.customer.findMany();
```

## Common Issues & Solutions

### Issue: "No GTM containers found"
- **Cause**: User doesn't have GTM container
- **Solution**: User needs to create GTM container first
- **Impact**: Setup skipped, connection succeeds (non-blocking)

### Issue: "Invalid_request" on token refresh
- **Cause**: OAuth2Client initialized without credentials
- **Solution**: Always pass clientId, clientSecret, callbackUrl to constructor

### Issue: User logged out after page refresh
- **Cause**: Likely auto-refresh not triggered or localStorage cleared
- **Check**: DevTools → Application → localStorage → `oneclicktag_auth_tokens`
- **Solution**: Verify auto-refresh is set up in App initialization

### Issue: Components created in wrong workspace
- **Cause**: Using `workspaces/-` instead of specific workspace ID
- **Solution**: Always pass workspaceId parameter to GTM methods

## Testing Checklist

### Google OAuth Connection
- [ ] Click "Connect Google Account"
- [ ] Grant all permissions (GTM, Ads, GA4)
- [ ] Check logs: "✓ Created OneClickTag workspace" or "✓ Found existing"
- [ ] Verify in GTM UI: OneClickTag workspace exists
- [ ] Check components: 3 variables, 1 trigger, 1 tag (Conversion Linker)

### Token Persistence
- [ ] Login to application
- [ ] Check localStorage: `oneclicktag_auth_tokens` exists
- [ ] Refresh page → Should stay logged in
- [ ] Close tab, reopen → Should stay logged in
- [ ] Console should show: "Successfully authenticated with backend"

### Database
- [ ] Check oauth_tokens: 3 records per customer (ads, gtm, ga4)
- [ ] Check google_ads_accounts: Populated after connection
- [ ] Check ga4_properties: Populated after connection

---

**Last Updated**: January 2025
**Status**: Production Ready ✅
