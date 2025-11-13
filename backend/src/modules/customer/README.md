# Customer Management Module

A comprehensive customer management system with multi-tenant support, advanced search capabilities, Google account integration, and bulk operations.

## Features

- ✅ **Complete CRUD operations** with automatic tenant scoping
- ✅ **Advanced pagination** with search, sort, and filter
- ✅ **Google account connection** flow with OAuth integration
- ✅ **Google Ads account synchronization** 
- ✅ **Bulk operations** (create, update, delete)
- ✅ **Comprehensive DTOs** with class-validator decorations
- ✅ **Full Swagger/OpenAPI** documentation
- ✅ **Proper error handling** and logging
- ✅ **Tenant-scoped caching** for optimal performance
- ✅ **Audit trails** with created/updated by tracking

## Database Schema

### Customer Model
```prisma
model Customer {
  id                String         @id @default(cuid())
  email             String         // Unique per tenant
  firstName         String
  lastName          String
  fullName          String         // Auto-generated
  company           String?
  phone             String?
  status            CustomerStatus @default(ACTIVE)
  tags              String[]       // Array of tags
  notes             String?
  customFields      Json?          // Flexible custom data
  
  // Google Account Integration
  googleAccountId   String?
  googleEmail       String?
  googleAdsAccounts GoogleAdsAccount[]
  
  // Tenant relation (automatic filtering)
  tenantId          String
  tenant            Tenant @relation(fields: [tenantId], references: [id])
  
  // Audit fields
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String?
  updatedBy         String?
}

enum CustomerStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  ARCHIVED
}
```

### Google Ads Account Model
```prisma
model GoogleAdsAccount {
  id                String   @id @default(cuid())
  googleAccountId   String
  accountId         String
  accountName       String
  currency          String
  timeZone          String
  isActive          Boolean  @default(true)
  
  customerId        String
  customer          Customer @relation(fields: [customerId], references: [id])
  tenantId          String
}
```

## API Endpoints

### Core CRUD Operations

#### Create Customer
```http
POST /customers
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Corporation",
  "phone": "+1-555-123-4567",
  "status": "ACTIVE",
  "tags": ["vip", "premium"],
  "notes": "Important customer",
  "customFields": {
    "industry": "Technology",
    "segment": "Enterprise"
  }
}
```

#### Get Paginated Customers
```http
GET /customers?page=1&limit=20&search=john&status=ACTIVE&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (1-based, default: 1)
- `limit` - Items per page (1-100, default: 20)
- `search` - Search across name, email, company
- `status` - Filter by status (ACTIVE|INACTIVE|SUSPENDED|ARCHIVED)
- `company` - Filter by company name
- `tags` - Filter by tags (comma-separated)
- `hasGoogleAccount` - Filter by Google account connection
- `sortBy` - Sort field (createdAt|firstName|lastName|email|company|status)
- `sortOrder` - Sort direction (asc|desc)
- `includeGoogleAds` - Include Google Ads accounts
- `createdAfter` - Filter by creation date
- `createdBefore` - Filter by creation date

#### Get Customer by ID
```http
GET /customers/{id}?includeGoogleAds=true
Authorization: Bearer <jwt-token>
```

#### Update Customer
```http
PUT /customers/{id}
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "firstName": "Jane",
  "company": "New Company",
  "tags": ["vip", "enterprise", "priority"]
}
```

#### Delete Customer
```http
DELETE /customers/{id}
Authorization: Bearer <jwt-token>
```

### Bulk Operations

#### Bulk Create
```http
POST /customers/bulk/create
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "customers": [
    {
      "email": "customer1@example.com",
      "firstName": "Customer",
      "lastName": "One"
    },
    {
      "email": "customer2@example.com",
      "firstName": "Customer",
      "lastName": "Two"
    }
  ]
}
```

#### Bulk Update
```http
PUT /customers/bulk/update
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "updates": [
    {
      "id": "customer-id-1",
      "data": { "status": "INACTIVE" }
    },
    {
      "id": "customer-id-2", 
      "data": { "company": "Updated Company" }
    }
  ]
}
```

#### Bulk Delete
```http
DELETE /customers/bulk/delete
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "customerIds": ["customer-id-1", "customer-id-2", "customer-id-3"]
}
```

### Google Integration

#### Get Google Auth URL
```http
GET /customers/{id}/google/auth-url
Authorization: Bearer <jwt-token>
```

#### Connect Google Account
```http
POST /customers/{id}/google/connect
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "code": "4/0AX4XfWjQ...",
  "redirectUri": "http://localhost:3000/oauth/callback"
}
```

#### Disconnect Google Account
```http
DELETE /customers/{id}/google/disconnect
Authorization: Bearer <jwt-token>
```

#### Sync Google Ads Accounts
```http
POST /customers/{id}/google/sync-ads
Authorization: Bearer <jwt-token>
```

#### Get Google Ads Accounts
```http
GET /customers/{id}/google/ads-accounts
Authorization: Bearer <jwt-token>
```

### Statistics

#### Get Customer Statistics
```http
GET /customers/stats
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "total": 150,
  "byStatus": {
    "active": 120,
    "inactive": 25,
    "suspended": 5
  },
  "withGoogleAccount": 80,
  "withoutGoogleAccount": 70,
  "recentlyCreated": 15,
  "tenantId": "tenant-id",
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## Usage Examples

### Basic Customer Operations

```typescript
import { CustomerService } from './modules/customer';

@Injectable()
export class YourService {
  constructor(private customerService: CustomerService) {}

  async createCustomer() {
    const customer = await this.customerService.create({
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corp',
      tags: ['vip'],
    });
    return customer;
  }

  async searchCustomers() {
    const result = await this.customerService.findAll({
      search: 'john',
      status: 'ACTIVE',
      hasGoogleAccount: true,
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return result;
  }
}
```

### Google Integration

```typescript
import { GoogleIntegrationService } from './modules/customer';

@Injectable()
export class GoogleService {
  constructor(private googleService: GoogleIntegrationService) {}

  async connectCustomerGoogleAccount(customerId: string, authCode: string) {
    const customer = await this.googleService.connectGoogleAccount(customerId, {
      code: authCode,
    });
    
    // Automatically sync Google Ads accounts
    await this.googleService.syncGoogleAdsAccounts(customerId);
    
    return customer;
  }
}
```

### Using in Controllers

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { CustomerService, CustomerQueryDto } from './modules/customer';
import { TenantId } from './modules/tenant';

@Controller('my-customers')
export class MyController {
  constructor(private customerService: CustomerService) {}

  @Get()
  async getCustomers(
    @Query() query: CustomerQueryDto,
    @TenantId() tenantId: string,
  ) {
    // Tenant filtering is automatic
    return this.customerService.findAll(query);
  }
}
```

## Validation and DTOs

### CreateCustomerDto
```typescript
{
  email: string;          // Required, valid email
  firstName: string;      // Required, 1-50 chars
  lastName: string;       // Required, 1-50 chars
  company?: string;       // Optional, max 100 chars
  phone?: string;         // Optional, international format
  status?: CustomerStatus; // Optional, defaults to ACTIVE
  tags?: string[];        // Optional, array of strings
  notes?: string;         // Optional, max 1000 chars
  customFields?: object;  // Optional, any JSON object
}
```

### CustomerQueryDto
```typescript
{
  page?: number;           // 1-based, default 1
  limit?: number;          // 1-100, default 20
  search?: string;         // Search term
  status?: CustomerStatus; // Filter by status
  company?: string;        // Filter by company
  tags?: string[];         // Filter by tags
  hasGoogleAccount?: boolean; // Filter by Google connection
  sortBy?: CustomerSortField; // Sort field
  sortOrder?: SortOrder;   // Sort direction
  includeGoogleAds?: boolean; // Include Google Ads data
  createdAfter?: string;   // ISO date string
  createdBefore?: string;  // ISO date string
}
```

## Error Handling

The module provides specific exceptions for different error scenarios:

- `CustomerNotFoundException` - Customer not found
- `CustomerEmailConflictException` - Email already exists
- `CustomerGoogleAccountException` - Google integration errors
- `InvalidCustomerDataException` - Validation errors
- `CustomerBulkOperationException` - Bulk operation failures

## Caching Strategy

The module uses tenant-scoped caching for optimal performance:

- **Customer lists** - 5 minutes TTL
- **Individual customers** - 10 minutes TTL  
- **Customer statistics** - 10 minutes TTL
- **Automatic cache invalidation** on create/update/delete operations

## Multi-Tenant Isolation

- All database queries are **automatically filtered** by tenant
- **Unique email constraint** is scoped to tenant
- **Google account connections** are tenant-isolated
- **Cache keys** are tenant-prefixed
- **OAuth tokens** are stored per tenant

## Logging and Monitoring

Comprehensive logging for:
- Customer CRUD operations
- Google account connections/disconnections
- Bulk operation results
- Search and filter queries
- Error conditions

## Security Features

- **JWT authentication** required for all endpoints
- **Tenant isolation** enforced at database level
- **Input validation** with class-validator
- **SQL injection protection** via Prisma
- **Rate limiting** via tenant-scoped operations

## Best Practices

1. **Always use bulk operations** for multiple customers
2. **Cache frequently accessed data** using tenant cache
3. **Use search parameters** instead of client-side filtering
4. **Handle Google OAuth errors** gracefully
5. **Validate email uniqueness** within tenant scope
6. **Use pagination** for large customer lists
7. **Include audit fields** for tracking changes

The customer management module provides a complete, production-ready solution for managing customers in a multi-tenant SaaS application with advanced search, Google integration, and comprehensive API documentation.