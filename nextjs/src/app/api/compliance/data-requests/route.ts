import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { DataRequestType, RequestStatus } from '@prisma/client';

interface CreateDataRequestBody {
  requestType: DataRequestType;
  email: string;
  description?: string;
}

/**
 * GET /api/compliance/data-requests
 * List all data access requests for the tenant
 * Query params: skip, take, status, requestType, userId, email
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '50', 10);
    const status = searchParams.get('status') as RequestStatus | null;
    const requestType = searchParams.get('requestType') as DataRequestType | null;
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    // Validate status if provided
    if (status) {
      const validStatuses = Object.values(RequestStatus);
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate requestType if provided
    if (requestType) {
      const validTypes = Object.values(DataRequestType);
      if (!validTypes.includes(requestType)) {
        return NextResponse.json(
          { error: `Invalid requestType. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const where = {
      tenantId: session.tenantId,
      ...(status && { status }),
      ...(requestType && { requestType }),
      ...(userId && { userId }),
      ...(email && { email: { contains: email, mode: 'insensitive' as const } }),
    };

    const [requests, total] = await Promise.all([
      prisma.dataAccessRequest.findMany({
        where,
        skip,
        take,
        orderBy: {
          requestedAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.dataAccessRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      total,
      skip,
      take,
    });
  } catch (error) {
    console.error('List data requests error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compliance/data-requests
 * Create a new data access request (GDPR Article 15-20)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const body: CreateDataRequestBody = await request.json();

    // Validate required fields
    if (!body.requestType || !body.email) {
      return NextResponse.json(
        { error: 'requestType and email are required' },
        { status: 400 }
      );
    }

    // Validate requestType enum
    const validTypes = Object.values(DataRequestType);
    if (!validTypes.includes(body.requestType)) {
      return NextResponse.json(
        { error: `Invalid requestType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Calculate due date (30 days from now - GDPR requirement)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const dataRequest = await prisma.dataAccessRequest.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id, // Associate with current user if authenticated
        requestType: body.requestType,
        email: body.email,
        description: body.description,
        dueDate,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(dataRequest, { status: 201 });
  } catch (error) {
    console.error('Create data request error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
