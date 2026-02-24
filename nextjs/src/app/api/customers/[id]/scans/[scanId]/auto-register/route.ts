import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { autoRegisterAccount } from '@/lib/site-scanner/services/auto-register';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

/**
 * POST /api/customers/[id]/scans/[scanId]/auto-register
 *
 * Attempts to automatically register a test account on the target website.
 * If successful, saves the credentials to the SiteCredential table.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id: customerId, scanId } = await params;

    console.log('[AutoRegister API] Starting auto-registration for scan:', scanId);

    // Verify scan exists and belongs to customer/tenant
    const scan = await prisma.siteScan.findFirst({
      where: {
        id: scanId,
        customerId,
        tenantId: session.tenantId,
      },
      select: {
        id: true,
        websiteUrl: true,
        loginUrl: true,
      },
    });

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Get login URL from scan or scan pages
    let loginUrl = scan.loginUrl;
    if (!loginUrl) {
      const loginPage = await prisma.scanPage.findFirst({
        where: {
          scanId,
          pageType: 'login',
        },
        select: { url: true },
      });
      loginUrl = loginPage?.url || scan.websiteUrl;
    }

    console.log('[AutoRegister API] Using login URL:', loginUrl);

    // Attempt auto-registration
    const result = await autoRegisterAccount(loginUrl, scan.websiteUrl);

    // If successful, save credentials
    if (result.success && result.credentials) {
      console.log('[AutoRegister API] Registration successful, saving credentials');

      const domain = new URL(scan.websiteUrl).hostname;

      // Check if credentials already exist for this domain
      const existingCredential = await prisma.siteCredential.findFirst({
        where: {
          customerId,
          tenantId: session.tenantId,
          domain,
        },
      });

      if (existingCredential) {
        // Update existing credential
        await prisma.siteCredential.update({
          where: { id: existingCredential.id },
          data: {
            username: result.credentials.email,
            password: result.credentials.password, // TODO: encrypt in production
            loginUrl,
            updatedAt: new Date(),
          },
        });
        console.log('[AutoRegister API] Updated existing credential');
      } else {
        // Create new credential
        await prisma.siteCredential.create({
          data: {
            customerId,
            tenantId: session.tenantId,
            domain,
            username: result.credentials.email,
            password: result.credentials.password, // TODO: encrypt in production
            loginUrl,
          },
        });
        console.log('[AutoRegister API] Created new credential');
      }

      // Update scan with credential info
      await prisma.siteScan.update({
        where: { id: scanId },
        data: {
          loginUrl,
        },
      });
    } else {
      console.log('[AutoRegister API] Registration failed:', result.error);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AutoRegister API] Error during auto-registration:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.message === 'No tenant associated with user') {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Auto-registration failed',
      },
      { status: 500 }
    );
  }
}
