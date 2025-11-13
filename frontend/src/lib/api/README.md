# Type-Safe API Client

A comprehensive, type-safe API client built with axios and OpenAPI TypeScript code generation. Features automatic token refresh, loading state management, consistent error handling, and React hooks integration.

## Features

- 🔐 **Automatic Token Refresh**: Seamless JWT token management with automatic refresh
- 📝 **Type Safety**: Auto-generated TypeScript types from OpenAPI/Swagger specifications
- 🔄 **Loading States**: Global and granular loading state management
- ❌ **Error Handling**: Consistent error handling with user-friendly messages
- 🪝 **React Hooks**: Ready-to-use React Query hooks for API integration
- 📊 **Monitoring**: Request/response logging and performance tracking
- 🔀 **Interceptors**: Request/response interceptors for auth, caching, and retries
- 📦 **Scoped Management**: Feature-specific API scopes for better organization

## Quick Start

### 1. Setup

```typescript
import { apiHub, ApiProvider } from '@/lib/api';

// Configure the API client
await apiHub.initialize({
  baseURL: 'https://api.oneclicktag.com',
  timeout: 30000,
  enableLogging: true,
  autoRefresh: true,
});
```

### 2. React Provider Setup

```tsx
import { ApiProvider } from '@/lib/api';

function App() {
  return (
    <ApiProvider config={{ baseURL: process.env.REACT_APP_API_URL }}>
      <YourApp />
    </ApiProvider>
  );
}
```

### 3. Using React Hooks

```tsx
import { useCustomers, useCreateCustomer } from '@/lib/api/hooks/useTypedApi';

function CustomerList() {
  const { data: customers, isLoading, error } = useCustomers({
    page: 1,
    limit: 20,
    status: 'active'
  });

  const createCustomer = useCreateCustomer({
    onSuccess: () => {
      toast.success('Customer created successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {customers?.data.data.map(customer => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  );
}
```

## API Clients

### TypedApiClient (Recommended)

Type-safe client with auto-generated types from OpenAPI schema:

```typescript
import { typedApiClient } from '@/lib/api';

// GET request with type-safe parameters
const customers = await typedApiClient.get('/api/customers', {
  query: {
    page: 1,
    limit: 20,
    status: 'active'
  }
});

// POST request with type-safe body
const newCustomer = await typedApiClient.post('/api/customers', {
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp'
  }
});

// PUT request with path parameters
const updatedCustomer = await typedApiClient.put('/api/customers/{id}', {
  params: { id: 'customer-123' },
  data: {
    name: 'John Smith',
    email: 'john.smith@example.com'
  }
});
```

### Legacy ApiClient

Lower-level client for custom usage:

```typescript
import { apiClient } from '@/lib/api';

// Basic requests
const response = await apiClient.get('/customers');
const customer = await apiClient.post('/customers', customerData);

// With configuration
const response = await apiClient.get('/customers', {
  timeout: 10000,
  retries: 3,
  skipAuth: false
});

// File operations
await apiClient.upload('/customers/avatar', file);
await apiClient.download('/customers/export', 'customers.csv');
```

## Services

### Type-Safe Customer Service

```typescript
import { typedCustomerService } from '@/lib/api';

// Get customers with filters
const customers = await typedCustomerService.getCustomers({
  page: 1,
  limit: 20,
  search: 'john',
  status: 'active',
  tags: ['vip', 'enterprise']
});

// Create customer
const newCustomer = await typedCustomerService.createCustomer({
  name: 'Jane Doe',
  email: 'jane@example.com',
  company: 'Tech Corp',
  tags: ['new-customer']
});

// Update customer
const updated = await typedCustomerService.updateCustomer('customer-123', {
  name: 'Jane Smith',
  status: 'active'
});

// Advanced operations
await typedCustomerService.connectGoogleAccount('customer-123', { 
  authCode: 'google-auth-code' 
});

await typedCustomerService.uploadAvatar('customer-123', avatarFile);

const analytics = await typedCustomerService.getCustomerAnalytics('customer-123', {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  metrics: ['revenue', 'events', 'conversions']
});
```

## React Hooks

### Query Hooks

```typescript
import { 
  useCustomers, 
  useCustomer, 
  useCustomerAnalytics,
  useCustomerStats 
} from '@/lib/api/hooks/useTypedApi';

// List customers with automatic caching
const { data, isLoading, error, refetch } = useCustomers({
  page: 1,
  limit: 20,
  status: 'active'
}, {
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000 // 5 minutes
});

// Single customer
const { data: customer } = useCustomer('customer-123');

// Customer analytics with dependencies
const { data: analytics } = useCustomerAnalytics('customer-123', {
  startDate: '2024-01-01',
  endDate: '2024-12-31'
}, {
  enabled: !!customer?.data // Only fetch if customer exists
});

// Global customer statistics
const { data: stats } = useCustomerStats({
  groupBy: 'month',
  includeComparison: true
});
```

### Mutation Hooks

```typescript
import { 
  useCreateCustomer, 
  useUpdateCustomer,
  useDeleteCustomer,
  useBulkDeleteCustomers 
} from '@/lib/api/hooks/useTypedApi';

// Create customer with optimistic updates
const createCustomer = useCreateCustomer({
  onMutate: async (newCustomer) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['customers'] });
    
    // Return context for rollback
    return { previousCustomers: queryClient.getQueryData(['customers']) };
  },
  onError: (err, newCustomer, context) => {
    // Rollback on error
    queryClient.setQueryData(['customers'], context?.previousCustomers);
  },
  onSettled: () => {
    // Always refetch after success or error
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  }
});

// Update with optimistic UI
const updateCustomer = useUpdateCustomer({
  onSuccess: (data, variables) => {
    toast.success('Customer updated successfully!');
  }
});

// Delete with confirmation
const deleteCustomer = useDeleteCustomer({
  onMutate: async (customerId) => {
    const confirmed = await confirm('Are you sure?');
    if (!confirmed) throw new Error('Cancelled');
  }
});

// Bulk operations
const bulkDelete = useBulkDeleteCustomers({
  onSuccess: (data) => {
    toast.success(`Deleted ${data.data.deleted} customers`);
    if (data.data.failed.length > 0) {
      toast.warning(`Failed to delete ${data.data.failed.length} customers`);
    }
  }
});
```

### Specialized Hooks

```typescript
import { 
  useCustomerSearch,
  useEmailAvailability,
  useOptimisticCustomerUpdate 
} from '@/lib/api/hooks/useTypedApi';

// Debounced search
const { data: searchResults } = useCustomerSearch(searchQuery, {
  enabled: searchQuery.length >= 2
});

// Email validation
const { data: emailCheck } = useEmailAvailability(email, currentCustomerId);

// Optimistic updates
const { optimisticUpdate, isLoading } = useOptimisticCustomerUpdate();

const handleQuickUpdate = async (id: string, name: string) => {
  await optimisticUpdate(
    id,
    { name }, // Optimistic UI update
    { name }  // Actual API payload
  );
};
```

## Authentication

### Token Management

```typescript
import { authManager } from '@/lib/api';

// Check authentication status
const isAuthenticated = authManager.isAuthenticated();
const hasValidToken = authManager.isAccessTokenValid();

// Get tokens
const accessToken = authManager.getAccessToken();
const refreshToken = authManager.getRefreshToken();

// Set tokens (usually after login)
authManager.setTokens({
  accessToken: 'jwt-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600000
});

// Clear tokens (logout)
authManager.clearTokens();

// Listen for token changes
const unsubscribe = authManager.addListener((tokens) => {
  if (!tokens) {
    // User logged out
    redirectToLogin();
  }
});
```

### Automatic Refresh

Token refresh is handled automatically by the client. When a token is about to expire:

1. The client automatically refreshes the token
2. All pending requests wait for the refresh
3. Requests are retried with the new token
4. If refresh fails, user is redirected to login

## Loading States

### Global Loading

```typescript
import { loadingManager } from '@/lib/api';

// Check if any request is loading
const isLoading = loadingManager.isLoading();

// Get all loading states
const loadingStates = loadingManager.getLoadingStates();

// Listen for loading changes
const unsubscribe = loadingManager.addListener((states, isGlobalLoading) => {
  // Update UI loading indicator
  setGlobalLoading(isGlobalLoading);
});
```

### Scoped Loading

```typescript
// Create feature-specific loading scope
const customerLoading = loadingManager.createScope('customers');

// Set loading for specific operation
customerLoading.setLoading(true, 'create-customer');

// Check if customer operations are loading
const isCustomerLoading = customerLoading.isLoading();
```

### React Hook for Loading States

```typescript
import { useCustomerLoadingStates } from '@/lib/api/hooks/useTypedApi';

function CustomerPage() {
  const loadingStates = useCustomerLoadingStates();
  
  const isCreating = loadingStates['customer-create'];
  const isUpdating = loadingStates['customer-update'];
  
  return (
    <div>
      {isCreating && <div>Creating customer...</div>}
      {isUpdating && <div>Updating customer...</div>}
    </div>
  );
}
```

## Error Handling

### Global Error Handling

```typescript
import { errorManager } from '@/lib/api';

// Listen for all errors
errorManager.addListener((error) => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      showNetworkErrorToast();
      break;
    case 'UNAUTHORIZED':
      redirectToLogin();
      break;
    case 'VALIDATION_ERROR':
      showValidationErrors(error.details.fields);
      break;
    default:
      showGenericErrorToast(error.message);
  }
});

// Get error statistics
const errorStats = errorManager.getErrorStats();
console.log('Total errors:', errorStats.totalErrors);
console.log('Errors by code:', errorStats.errorsByCode);
```

### User-Friendly Error Messages

```typescript
import { errorManager } from '@/lib/api';

// Get user-friendly message
const friendlyMessage = errorManager.getUserFriendlyMessage(error);

// Check if error should be retried
const shouldRetry = errorManager.shouldRetry(error);
```

### React Hook for Error Handling

```typescript
import { useCustomerErrors } from '@/lib/api/hooks/useTypedApi';

function CustomerPage() {
  const { errors, clearErrors, hasErrors, latestError } = useCustomerErrors();
  
  return (
    <div>
      {hasErrors && (
        <ErrorAlert 
          error={latestError} 
          onClose={clearErrors}
        />
      )}
    </div>
  );
}
```

## Code Generation

### Generating Types

```bash
# Generate types from local development server
npm run generate-types

# Generate types from production API
npm run generate-api:prod

# Generate both types and client code
npm run generate-api
```

### Custom Generation

```bash
# Using openapi-typescript directly
openapi-typescript http://localhost:3001/api/docs/swagger.json -o src/lib/api/generated/schema.ts

# Using openapi-typescript-codegen
openapi-codegen-typescript --input http://localhost:3001/api/docs/swagger.json --output src/lib/api/generated --client axios
```

## Configuration

### API Configuration

```typescript
import { ApiConfig } from '@/lib/api';

const config: ApiConfig = {
  baseURL: 'https://api.oneclicktag.com',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableLogging: process.env.NODE_ENV === 'development',
  requestInterceptors: [],
  responseInterceptors: [],
};
```

### Environment Variables

```env
REACT_APP_API_URL=https://api.oneclicktag.com
REACT_APP_API_TIMEOUT=30000
REACT_APP_ENABLE_API_LOGGING=true
```

## Monitoring and Debugging

### Debug Information

```typescript
import { apiHub } from '@/lib/api';

// Get comprehensive debug info
const debugInfo = apiHub.getDebugInfo();
console.log('Auth status:', debugInfo.auth);
console.log('Loading states:', debugInfo.loading);
console.log('Error stats:', debugInfo.errors);
console.log('Config:', debugInfo.config);
```

### Health Checks

```typescript
import { apiHub } from '@/lib/api';

// Check API health
const health = await apiHub.healthCheck();
console.log('API Status:', health.status);
console.log('Services:', health.services);
```

### Performance Monitoring

```typescript
// Response interceptor includes timing information
apiClient.interceptors.response.use((response) => {
  const duration = response.__duration;
  const requestId = response.__requestId;
  
  console.log(`Request ${requestId} took ${duration}ms`);
  return response;
});
```

## Best Practices

### 1. Use TypeScript Everywhere

```typescript
// ✅ Good - Type-safe
const customers = await typedApiClient.get('/api/customers', {
  query: { status: 'active' }
});

// ❌ Avoid - No type safety
const customers = await apiClient.get('/customers?status=active');
```

### 2. Handle Loading States

```typescript
// ✅ Good - Show loading state
function CustomerList() {
  const { data, isLoading, error } = useCustomers();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <CustomerTable data={data} />;
}
```

### 3. Implement Error Boundaries

```typescript
// ✅ Good - Error boundary for API errors
function CustomerErrorBoundary({ children }) {
  const { hasErrors, latestError, clearErrors } = useCustomerErrors();
  
  if (hasErrors) {
    return <ErrorFallback error={latestError} onRetry={clearErrors} />;
  }
  
  return children;
}
```

### 4. Use Query Keys Consistently

```typescript
// ✅ Good - Consistent query keys
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: any) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};
```

### 5. Optimize with React Query

```typescript
// ✅ Good - Optimized caching
const { data } = useCustomers(filters, {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
```

## Troubleshooting

### Common Issues

1. **Token Refresh Loops**: Ensure refresh endpoint doesn't require authentication
2. **Type Errors**: Regenerate types after API changes
3. **Loading States**: Check if loading manager is properly initialized
4. **CORS Issues**: Configure CORS headers on the backend
5. **Network Errors**: Check base URL and network connectivity

### Debug Mode

```typescript
// Enable debug mode
await apiHub.initialize({
  enableLogging: true,
  // other config
});

// Check debug info
console.log(apiHub.getDebugInfo());
```

## Migration Guide

### From Legacy Client

```typescript
// Before (legacy)
const response = await apiClient.get('/customers');
const customers = response.data;

// After (typed)
const response = await typedApiClient.get('/api/customers');
const customers = response.data; // Fully typed!
```

### Updating Generated Types

1. Update your OpenAPI/Swagger documentation
2. Run `npm run generate-api`
3. Fix any TypeScript errors
4. Test the API endpoints

This comprehensive API client provides a robust foundation for building type-safe, scalable React applications with excellent developer experience and runtime reliability.