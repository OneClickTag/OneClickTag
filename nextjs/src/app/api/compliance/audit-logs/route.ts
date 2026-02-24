import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/compliance/audit-logs
 * List all API audit logs for the tenant
 * Query params: page, limit, apiService, httpMethod
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const apiService = searchParams.get('action'); // maps 'action' filter to 'apiService'
    const resource = searchParams.get('resource'); // maps to 'httpMethod' or custom logic

    const skip = (page - 1) * limit;

    const where = {
      tenantId: session.tenantId,
      ...(apiService && { apiService: { contains: apiService, mode: 'insensitive' as const } }),
      ...(resource && { httpMethod: resource }),
    };

    const [logs, total] = await Promise.all([
      prisma.apiAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.apiAuditLog.count({ where }),
    ]);

    // Transform logs to match expected interface
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.user?.email,
      action: log.httpMethod, // e.g., "GET", "POST", "DELETE"
      resource: log.apiService, // e.g., "GTM API", "Google Ads API"
      resourceId: log.customerId,
      details: {
        endpoint: log.endpoint,
        responseStatus: log.responseStatus,
        durationMs: log.durationMs,
        customerName: log.customer?.fullName,
        ...(log.errorMessage && { error: log.errorMessage }),
      },
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data: transformedLogs,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('List audit logs error:', error);

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
