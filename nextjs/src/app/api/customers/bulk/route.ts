// POST /api/customers/bulk/create - Bulk create customers
// PUT /api/customers/bulk/update - Bulk update customers
// DELETE /api/customers/bulk/delete - Bulk delete customers

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  bulkCreateCustomers,
  bulkUpdateCustomers,
  bulkDeleteCustomers,
} from '@/lib/api/customers/service';
import {
  CustomerStatus,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@/lib/api/customers/types';

// Validate single customer input for bulk create
function validateSingleCustomerInput(
  input: unknown
): CreateCustomerInput | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const data = input as Record<string, unknown>;

  // Required fields
  if (!data.email || typeof data.email !== 'string') return null;
  if (!data.firstName || typeof data.firstName !== 'string') return null;
  if (!data.lastName || typeof data.lastName !== 'string') return null;

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) return null;

  return {
    email: data.email.trim(),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    company: typeof data.company === 'string' ? data.company.trim() : undefined,
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    status: Object.values(CustomerStatus).includes(data.status as CustomerStatus)
      ? (data.status as CustomerStatus)
      : CustomerStatus.ACTIVE,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    customFields:
      data.customFields && typeof data.customFields === 'object'
        ? (data.customFields as Record<string, unknown>)
        : undefined,
  };
}

// Validate bulk create input
function validateBulkCreateInput(
  data: unknown
): { valid: true; customers: CreateCustomerInput[] } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const input = data as Record<string, unknown>;

  if (!Array.isArray(input.customers)) {
    return { valid: false, error: 'customers must be an array' };
  }

  if (input.customers.length === 0) {
    return { valid: false, error: 'customers array cannot be empty' };
  }

  const customers: CreateCustomerInput[] = [];
  for (let i = 0; i < input.customers.length; i++) {
    const validated = validateSingleCustomerInput(input.customers[i]);
    if (!validated) {
      return { valid: false, error: `Invalid customer data at index ${i}` };
    }
    customers.push(validated);
  }

  return { valid: true, customers };
}

// Validate bulk update input
function validateBulkUpdateInput(
  data: unknown
): {
  valid: true;
  updates: Array<{ id: string; data: UpdateCustomerInput }>;
} | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const input = data as Record<string, unknown>;

  if (!Array.isArray(input.updates)) {
    return { valid: false, error: 'updates must be an array' };
  }

  if (input.updates.length === 0) {
    return { valid: false, error: 'updates array cannot be empty' };
  }

  const updates: Array<{ id: string; data: UpdateCustomerInput }> = [];
  for (let i = 0; i < input.updates.length; i++) {
    const update = input.updates[i] as Record<string, unknown>;
    if (!update.id || typeof update.id !== 'string') {
      return { valid: false, error: `Missing or invalid id at index ${i}` };
    }
    if (!update.data || typeof update.data !== 'object') {
      return { valid: false, error: `Missing or invalid data at index ${i}` };
    }
    updates.push({
      id: update.id,
      data: update.data as UpdateCustomerInput,
    });
  }

  return { valid: true, updates };
}

// Validate bulk delete input
function validateBulkDeleteInput(
  data: unknown
): { valid: true; customerIds: string[] } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const input = data as Record<string, unknown>;

  if (!Array.isArray(input.customerIds)) {
    return { valid: false, error: 'customerIds must be an array' };
  }

  if (input.customerIds.length === 0) {
    return { valid: false, error: 'customerIds array cannot be empty' };
  }

  for (let i = 0; i < input.customerIds.length; i++) {
    if (typeof input.customerIds[i] !== 'string') {
      return { valid: false, error: `Invalid customerId at index ${i}` };
    }
  }

  return { valid: true, customerIds: input.customerIds as string[] };
}

// POST /api/customers/bulk - Bulk create
export async function POST(request: NextRequest) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    // Parse request body
    const body = await request.json();

    // Check operation type from URL
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    if (operation === 'create') {
      // Validate input
      const validation = validateBulkCreateInput(body);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Bulk create customers
      const results = await bulkCreateCustomers(
        { customers: validation.customers },
        session.tenantId,
        session.id
      );

      return NextResponse.json(results, { status: 201 });
    }

    if (operation === 'update') {
      // Validate input
      const validation = validateBulkUpdateInput(body);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Bulk update customers
      const results = await bulkUpdateCustomers(
        { updates: validation.updates },
        session.tenantId,
        session.id
      );

      return NextResponse.json(results);
    }

    if (operation === 'delete') {
      // Validate input
      const validation = validateBulkDeleteInput(body);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Bulk delete customers
      const results = await bulkDeleteCustomers(
        { customerIds: validation.customerIds },
        session.tenantId
      );

      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: 'Invalid operation. Use ?operation=create, ?operation=update, or ?operation=delete' },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/customers/bulk error:', error);

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
