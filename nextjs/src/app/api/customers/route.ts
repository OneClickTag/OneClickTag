// GET /api/customers - List all customers (with pagination, search, filters)
// POST /api/customers - Create customer

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  createCustomer,
  findAllCustomers,
  getCustomerStats,
  CustomerEmailConflictError,
  InvalidCustomerDataError,
} from '@/lib/api/customers/service';
import {
  CustomerQueryParams,
  CreateCustomerInput,
  CustomerStatus,
  CustomerSortField,
  SortOrder,
} from '@/lib/api/customers/types';

// Parse query params from URL
function parseQueryParams(searchParams: URLSearchParams): CustomerQueryParams {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const hasGoogleAccount = searchParams.get('hasGoogleAccount');
  const includeGoogleAds = searchParams.get('includeGoogleAds');
  const tagsParam = searchParams.get('tags');

  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    search: searchParams.get('search') || undefined,
    status: (searchParams.get('status') as CustomerStatus) || undefined,
    company: searchParams.get('company') || undefined,
    tags: tagsParam ? tagsParam.split(',').map((t) => t.trim()) : undefined,
    hasGoogleAccount:
      hasGoogleAccount === 'true'
        ? true
        : hasGoogleAccount === 'false'
          ? false
          : undefined,
    sortBy: (searchParams.get('sortBy') as CustomerSortField) || undefined,
    sortOrder: (searchParams.get('sortOrder') as SortOrder) || undefined,
    includeGoogleAds: includeGoogleAds === 'true',
    createdAfter: searchParams.get('createdAfter') || undefined,
    createdBefore: searchParams.get('createdBefore') || undefined,
  };
}

// Validate create customer input
function validateCreateInput(
  data: unknown
): { valid: true; data: CreateCustomerInput } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const input = data as Record<string, unknown>;

  // Required fields
  if (!input.email || typeof input.email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  if (!input.firstName || typeof input.firstName !== 'string') {
    return { valid: false, error: 'First name is required' };
  }
  if (!input.lastName || typeof input.lastName !== 'string') {
    return { valid: false, error: 'Last name is required' };
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Length validations
  if (input.firstName.length < 1 || input.firstName.length > 50) {
    return { valid: false, error: 'First name must be 1-50 characters' };
  }
  if (input.lastName.length < 1 || input.lastName.length > 50) {
    return { valid: false, error: 'Last name must be 1-50 characters' };
  }

  // Optional field validations
  if (input.company && typeof input.company !== 'string') {
    return { valid: false, error: 'Company must be a string' };
  }
  if (
    input.company &&
    typeof input.company === 'string' &&
    input.company.length > 100
  ) {
    return { valid: false, error: 'Company must be at most 100 characters' };
  }

  if (input.phone !== undefined && input.phone !== null) {
    if (typeof input.phone !== 'string') {
      return { valid: false, error: 'Phone must be a string' };
    }
    if (input.phone.length > 20) {
      return { valid: false, error: 'Phone must be at most 20 characters' };
    }
  }

  // WebsiteUrl validation
  if (input.websiteUrl !== undefined && input.websiteUrl !== null && input.websiteUrl !== '') {
    if (typeof input.websiteUrl !== 'string') {
      return { valid: false, error: 'Website URL must be a string' };
    }
    try {
      new URL(input.websiteUrl as string);
    } catch {
      return { valid: false, error: 'Invalid website URL format' };
    }
  }

  if (input.status && !Object.values(CustomerStatus).includes(input.status as CustomerStatus)) {
    return { valid: false, error: 'Invalid customer status' };
  }

  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) {
      return { valid: false, error: 'Tags must be an array' };
    }
    for (const tag of input.tags) {
      if (typeof tag !== 'string' || tag.length > 30) {
        return { valid: false, error: 'Each tag must be a string of at most 30 characters' };
      }
    }
  }

  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== 'string') {
      return { valid: false, error: 'Notes must be a string' };
    }
    if (input.notes.length > 1000) {
      return { valid: false, error: 'Notes must be at most 1000 characters' };
    }
  }

  return {
    valid: true,
    data: {
      email: (input.email as string).trim(),
      firstName: (input.firstName as string).trim(),
      lastName: (input.lastName as string).trim(),
      company: input.company
        ? (input.company as string).trim()
        : undefined,
      phone: input.phone as string | undefined,
      websiteUrl: (input.websiteUrl && input.websiteUrl !== '') ? (input.websiteUrl as string).trim() : undefined,
      status: (input.status as CustomerStatus) || CustomerStatus.ACTIVE,
      tags: (input.tags as string[]) || [],
      notes: input.notes as string | undefined,
      customFields: input.customFields as Record<string, unknown> | undefined,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    // Check if this is a stats request
    const { searchParams } = new URL(request.url);
    if (searchParams.get('stats') === 'true') {
      const stats = await getCustomerStats(session.tenantId, session.id);
      return NextResponse.json(stats);
    }

    // Parse query parameters
    const query = parseQueryParams(searchParams);

    // Fetch customers with multi-tenant filtering
    const result = await findAllCustomers(query, session.tenantId, session.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/customers error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json(
          { error: 'No tenant associated with user' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = validateCreateInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create customer with multi-tenant context
    const customer = await createCustomer(
      validation.data,
      session.tenantId,
      session.id
    );

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('POST /api/customers error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json(
          { error: 'No tenant associated with user' },
          { status: 403 }
        );
      }
    }

    if (error instanceof CustomerEmailConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof InvalidCustomerDataError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
