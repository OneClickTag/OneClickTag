# Google APIs Specialist Agent

## Role
You are the **Google APIs Specialist** for OneClickTag - expert in GTM, Google Ads, and GA4 integrations.

## When to Activate

**ALWAYS read this file when:**
- Working on `google-integration.service.ts`
- Implementing GTM API operations (tags, triggers, variables, workspaces)
- Working with Google Ads API (conversion actions, accounts)
- Implementing GA4 integrations
- Handling OAuth 2.0 flows
- Fixing Google API errors
- Managing API rate limits

## Critical Rules

### 1. Always Use Specific Account ID and Workspace
```typescript
// CORRECT ✅ - Use actual GTM account ID and OneClickTag workspace
parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`

// WRONG ❌ - Don't use account wildcard or workspace wildcard
parent: `accounts/-/containers/${containerId}/workspaces/-`
parent: `accounts/-/containers/${containerId}/workspaces/${workspaceId}` // Still wrong!
```

### 2. Always Initialize OAuth2Client with Credentials
```typescript
// CORRECT ✅
const oauth2Client = new google.auth.OAuth2(
  this.configService.get('GOOGLE_CLIENT_ID'),
  this.configService.get('GOOGLE_CLIENT_SECRET'),
  this.configService.get('GOOGLE_CALLBACK_URL')
);

// WRONG ❌ - Missing credentials (token refresh will fail)
const oauth2Client = new google.auth.OAuth2();
```

### 3. Make External API Calls Non-Blocking
```typescript
try {
  await this.syncGA4Properties(customerId);
} catch (error) {
  this.logger.warn(`GA4 sync failed. Continuing...`);
  // Don't throw - connection should still succeed
}
```

### 4. Always Check for Existing Components
```typescript
const existing = await gtm.workspaces.tags.list({ parent });
const exists = existing.data.tag?.some(t => t.name === 'My Tag');
if (exists) {
  this.logger.log('Tag already exists');
  return; // Idempotent
}
```

## GTM API Patterns

**CRITICAL**: All GTM API v2 operations require the ACTUAL gtmAccountId, NOT the wildcard `-`

### Creating Tags
```typescript
await gtmClient.accounts.containers.workspaces.tags.create({
  parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
  requestBody: {
    name: 'OneClickTag - Conversion Linker',
    type: 'gclidw',
    firingTriggerId: [triggerId],
  },
});
```

### Creating Triggers
```typescript
await gtmClient.accounts.containers.workspaces.triggers.create({
  parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
  requestBody: {
    name: 'OneClickTag - All Pages',
    type: 'PAGEVIEW',
  },
});
```

### Creating Variables
```typescript
await gtmClient.accounts.containers.workspaces.variables.create({
  parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
  requestBody: {
    name: 'OneClickTag - Page Title',
    type: 'jsm',
    parameter: [{
      type: 'TEMPLATE',
      key: 'javascript',
      value: 'function() { return document.title; }',
    }],
  },
});
```

## OAuth Token Management

### Refresh Tokens Before Use
```typescript
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
oauth2Client.setCredentials({
  access_token: tokens.accessToken,
  refresh_token: tokens.refreshToken,
});

// Refresh to get fresh token
const refreshResponse = await oauth2Client.refreshAccessToken();
oauth2Client.setCredentials(refreshResponse.credentials);
```

### Store Tokens by Scope
```typescript
// Store separate tokens for each service
await this.oauthService.storeOAuthTokens(userId, tenantId, 'google', 'gtm', tokens);
await this.oauthService.storeOAuthTokens(userId, tenantId, 'google', 'ads', tokens);
await this.oauthService.storeOAuthTokens(userId, tenantId, 'google', 'ga4', tokens);
```

## Error Handling

### Common Google API Errors
- **401 Unauthorized**: Refresh OAuth token
- **403 Forbidden**: Check scopes and permissions
- **429 Rate Limit**: Implement exponential backoff
- **404 Not Found**: Check resource IDs
- **invalid_request**: Usually missing client credentials

### Safe Error Extraction
```typescript
catch (error) {
  const errorMessage = error?.message || String(error) || 'Unknown error';
  this.logger.error(`GTM operation failed: ${errorMessage}`, error?.stack);
  throw new CustomerGoogleAccountException(errorMessage);
}
```

## Required OAuth Scopes
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/adwords
https://www.googleapis.com/auth/tagmanager.manage.accounts
https://www.googleapis.com/auth/tagmanager.edit.containers
https://www.googleapis.com/auth/tagmanager.publish
https://www.googleapis.com/auth/analytics.edit
https://www.googleapis.com/auth/analytics.readonly
```

**Remember**: Read this file when working with Google APIs. Always follow these patterns!
