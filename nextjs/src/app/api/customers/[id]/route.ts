// GET /api/customers/[id] - Get single customer
// PUT /api/customers/[id] - Update customer
// DELETE /api/customers/[id] - Delete customer

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  findCustomerById,
  findCustomerBySlug,
  updateCustomer,
  deleteCustomer,
  CustomerNotFoundError,
  CustomerEmailConflictError,
  InvalidCustomerDataError,
} from '@/lib/api/customers/service';
import { UpdateCustomerInput, CustomerStatus } from '@/lib/api/customers/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Validate update customer input
function validateUpdateInput(
  data: unknown
): { valid: true; data: UpdateCustomerInput } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const input = data as Record<string, unknown>;
  const updateData: UpdateCustomerInput = {};

  // Email validation
  if (input.email !== undefined) {
    if (typeof input.email !== 'string') {
      return { valid: false, error: 'Email must be a string' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    updateData.email = input.email.trim();
  }

  // First name validation
  if (input.firstName !== undefined) {
    if (typeof input.firstName !== 'string') {
      return { valid: false, error: 'First name must be a string' };
    }
    if (input.firstName.length < 1 || input.firstName.length > 50) {
      return { valid: false, error: 'First name must be 1-50 characters' };
    }
    updateData.firstName = input.firstName.trim();
  }

  // Last name validation
  if (input.lastName !== undefined) {
    if (typeof input.lastName !== 'string') {
      return { valid: false, error: 'Last name must be a string' };
    }
    if (input.lastName.length < 1 || input.lastName.length > 50) {
      return { valid: false, error: 'Last name must be 1-50 characters' };
    }
    updateData.lastName = input.lastName.trim();
  }

  // Company validation
  if (input.company !== undefined) {
    if (input.company !== null && typeof input.company !== 'string') {
      return { valid: false, error: 'Company must be a string or null' };
    }
    if (
      typeof input.company === 'string' &&
      input.company.length > 100
    ) {
      return { valid: false, error: 'Company must be at most 100 characters' };
    }
    updateData.company = input.company ? (input.company as string).trim() : undefined;
  }

  // Phone validation
  if (input.phone !== undefined) {
    if (input.phone !== null && typeof input.phone !== 'string') {
      return { valid: false, error: 'Phone must be a string or null' };
    }
    if (typeof input.phone === 'string' && input.phone.length > 20) {
      return { valid: false, error: 'Phone must be at most 20 characters' };
    }
    updateData.phone = input.phone as string | undefined;
  }

  // Status validation
  if (input.status !== undefined) {
    if (!Object.values(CustomerStatus).includes(input.status as CustomerStatus)) {
      return { valid: false, error: 'Invalid customer status' };
    }
    updateData.status = input.status as CustomerStatus;
  }

  // Tags validation
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) {
      return { valid: false, error: 'Tags must be an array' };
    }
    for (const tag of input.tags) {
      if (typeof tag !== 'string' || tag.length > 30) {
        return { valid: false, error: 'Each tag must be a string of at most 30 characters' };
      }
    }
    updateData.tags = input.tags as string[];
  }

  // Notes validation
  if (input.notes !== undefined) {
    if (input.notes !== null && typeof input.notes !== 'string') {
      return { valid: false, error: 'Notes must be a string or null' };
    }
    if (typeof input.notes === 'string' && input.notes.length > 1000) {
      return { valid: false, error: 'Notes must be at most 1000 characters' };
    }
    updateData.notes = input.notes as string | undefined;
  }

  // Custom fields validation
  if (input.customFields !== undefined) {
    if (
      input.customFields !== null &&
      typeof input.customFields !== 'object'
    ) {
      return { valid: false, error: 'Custom fields must be an object or null' };
    }
    updateData.customFields = input.customFields as Record<string, unknown> | undefined;
  }

  return { valid: true, data: updateData };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Check if includeGoogleAds is requested
    const { searchParams } = new URL(request.url);
    const includeGoogleAds = searchParams.get('includeGoogleAds') === 'true';

    // Check if looking up by slug (8 character alphanumeric)
    const isSlug = /^[a-z0-9]{8}$/.test(id);

    let customer;
    if (isSlug) {
      customer = await findCustomerBySlug(id, session.tenantId, includeGoogleAds);
    } else {
      customer = await findCustomerById(id, session.tenantId, includeGoogleAds);
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error(`GET /api/customers/[id] error:`, error);

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

    if (error instanceof CustomerNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = validateUpdateInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Update customer with multi-tenant context
    const customer = await updateCustomer(
      id,
      validation.data,
      session.tenantId,
      session.id
    );

    return NextResponse.json(customer);
  } catch (error) {
    console.error(`PUT /api/customers/[id] error:`, error);

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

    if (error instanceof CustomerNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Delete customer with multi-tenant context
    await deleteCustomer(id, session.tenantId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`DELETE /api/customers/[id] error:`, error);

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

    if (error instanceof CustomerNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
