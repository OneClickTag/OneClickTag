// GET /api/customers/[id]/scans - List scan history
// POST /api/customers/[id]/scans - Start a new scan

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId } = await params;

    const scans = await prisma.siteScan.findMany({
      where: { customerId, tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        websiteUrl: true,
        detectedNiche: true,
        confirmedNiche: true,
        totalPagesScanned: true,
        totalRecommendations: true,
        trackingReadinessScore: true,
        aiAnalysisUsed: true,
        createdAt: true,
      },
    });

    return NextResponse.json(scans);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to list scans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId } = await params;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenantId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const websiteUrl = body.websiteUrl || customer.websiteUrl;

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    // Check for active scans
    const activeScan = await prisma.siteScan.findFirst({
      where: {
        customerId,
        tenantId: session.tenantId,
        status: { in: ['QUEUED', 'DISCOVERING', 'CRAWLING', 'NICHE_DETECTED', 'AWAITING_CONFIRMATION', 'DEEP_CRAWLING', 'ANALYZING'] },
      },
    });
    if (activeScan) {
      return NextResponse.json({ error: 'A scan is already in progress for this customer' }, { status: 409 });
    }

    // Create scan in DISCOVERING state
    const scan = await prisma.siteScan.create({
      data: {
        customerId,
        tenantId: session.tenantId,
        websiteUrl,
        maxPages: body.maxPages || 200,
        maxDepth: body.maxDepth || 8,
        status: 'DISCOVERING',
      },
    });

    // Pre-crawl: discover URLs from robots.txt + sitemap.xml
    const { discoverAllUrls } = await import('@/lib/site-scanner/services/sitemap-parser');
    const { createEmptyDiscovery } = await import('@/lib/site-scanner/services/chunk-processor');

    let domain: string;
    try {
      domain = new URL(websiteUrl).hostname;
    } catch {
      domain = websiteUrl.replace(/^https?:\/\//, '').split('/')[0];
    }

    const preCrawl = await discoverAllUrls(domain);

    // Normalize the main URL for consistent dedup
    const normalizeUrl = (u: string): string => {
      try {
        const p = new URL(u);
        if (p.hash && !p.hash.startsWith('#/')) p.hash = '';
        p.pathname = p.pathname.replace(/\/+$/, '') || '/';
        return p.toString();
      } catch { return u; }
    };

    const normalizedWebsiteUrl = normalizeUrl(websiteUrl);

    // Build initial URL queue: homepage first, then sitemap URLs
    const urlQueue: Array<{ url: string; depth: number; source: string }> = [
      { url: normalizedWebsiteUrl, depth: 0, source: 'homepage' },
    ];
    const seenUrls = new Set([normalizedWebsiteUrl]);

    // Add sitemap URLs (limit to maxPages to avoid huge queues)
    const maxPages = body.maxPages || 200;
    for (const rawUrl of preCrawl.urls) {
      if (urlQueue.length >= maxPages) break;
      const normalized = normalizeUrl(rawUrl);
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        urlQueue.push({ url: normalized, depth: 1, source: 'sitemap' });
      }
    }

    // Initialize discovery state
    const discovery = createEmptyDiscovery();
    discovery.sitemapFound = preCrawl.sitemapFound;
    discovery.robotsFound = preCrawl.robotsFound;
    discovery.totalUrlsDiscovered = urlQueue.length;

    // Update scan with pre-crawl results and transition to CRAWLING
    const updated = await prisma.siteScan.update({
      where: { id: scan.id },
      data: {
        status: 'CRAWLING',
        urlQueue: urlQueue as any,
        crawledUrls: [] as any,
        liveDiscovery: discovery as any,
        totalUrlsFound: urlQueue.length,
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to start scan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
