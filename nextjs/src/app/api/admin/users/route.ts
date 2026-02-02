import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// GET /api/admin/users - Get all users with filtering and pagination
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const hasToken = !!authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20;

  if (!hasToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let session;
  try {
    session = await getSessionFromRequest(request);
  } catch (sessionError) {
    console.error('[Users API] Session error:', sessionError);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const skip = (page - 1) * limit;
    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        planId: true,
        planEndDate: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    // Fetch plans separately to avoid Decimal serialization issues
    const planIds = users.map(u => u.planId).filter((id): id is string => id !== null);
    const plansMap = new Map<string, { id: string; name: string; price: number | null }>();

    if (planIds.length > 0) {
      const plans = await prisma.plan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true, price: true },
      });
      plans.forEach(p => {
        plansMap.set(p.id, {
          id: p.id,
          name: p.name,
          price: p.price ? Number(p.price) : null,
        });
      });
    }

    const responseData = {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant,
        planId: user.planId,
        plan: user.planId ? plansMap.get(user.planId) || null : null,
        planEndDate: user.planEndDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Users API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
