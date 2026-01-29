import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { RequestStatus } from '@prisma/client';

interface UpdateDataRequestBody {
  status?: RequestStatus;
  responseMessage?: string;
  dataExportUrl?: string;
  assignedTo?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/compliance/data-requests/[id]
 * Get a specific data access request
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    const dataRequest = await prisma.dataAccessRequest.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
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
    });

    if (!dataRequest) {
      return NextResponse.json(
        { error: `Data request with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(dataRequest);
  } catch (error) {
    console.error('Get data request error:', error);

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
 * PUT /api/compliance/data-requests/[id]
 * Update a data access request status
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;
    const body: UpdateDataRequestBody = await request.json();

    // Verify request exists and belongs to tenant
    const existing = await prisma.dataAccessRequest.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Data request with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = Object.values(RequestStatus);
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // If assignedTo is provided, verify the user exists in the same tenant
    if (body.assignedTo) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: body.assignedTo,
          tenantId: session.tenantId,
        },
      });

      if (!assignedUser) {
        return NextResponse.json(
          { error: `User with ID ${body.assignedTo} not found in this tenant` },
          { status: 404 }
        );
      }
    }

    // Build update data with completedAt timestamp if status is COMPLETED
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      // Set completedAt timestamp when status changes to COMPLETED
      if (body.status === RequestStatus.COMPLETED && existing.status !== RequestStatus.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }
    if (body.responseMessage !== undefined) {
      updateData.responseMessage = body.responseMessage;
    }
    if (body.dataExportUrl !== undefined) {
      updateData.dataExportUrl = body.dataExportUrl;
    }
    if (body.assignedTo !== undefined) {
      updateData.assignedTo = body.assignedTo;
    }

    const dataRequest = await prisma.dataAccessRequest.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(dataRequest);
  } catch (error) {
    console.error('Update data request error:', error);

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
 * DELETE /api/compliance/data-requests/[id]
 * Delete a data access request
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Verify request exists and belongs to tenant
    const existing = await prisma.dataAccessRequest.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Data request with ID ${id} not found` },
        { status: 404 }
      );
    }

    await prisma.dataAccessRequest.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Data request deleted successfully' });
  } catch (error) {
    console.error('Delete data request error:', error);

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
