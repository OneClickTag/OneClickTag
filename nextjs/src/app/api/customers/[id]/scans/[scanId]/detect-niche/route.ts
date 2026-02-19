// POST /api/customers/[id]/scans/[scanId]/detect-niche
// Called after all Phase 1 chunks complete to run AI niche detection

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId, scanId } = await params;

    // Verify scan belongs to customer + tenant
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId },
      include: {
        pages: {
          select: {
            url: true,
            title: true,
            pageType: true,
            hasForm: true,
            hasCTA: true,
            hasVideo: true,
            hasPhoneLink: true,
            hasEmailLink: true,
            headings: true,
            metaTags: true,
            contentSummary: true,
          },
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (scan.status !== 'CRAWLING' && scan.status !== 'DISCOVERING') {
      return NextResponse.json(
        { error: `Cannot detect niche in status: ${scan.status}` },
        { status: 400 }
      );
    }

    // Build crawl summary from accumulated data
    const liveDiscovery = scan.liveDiscovery as any;
    const pages = scan.pages;
    const homepage = pages[0];

    const pageTypes: Record<string, number> = {};
    for (const page of pages) {
      const type = page.pageType || 'other';
      pageTypes[type] = (pageTypes[type] || 0) + 1;
    }

    const urlPatterns = pages
      .map(p => {
        try { return new URL(p.url).pathname; } catch { return p.url; }
      })
      .slice(0, 30);

    const technologies = liveDiscovery?.technologies
      ? buildTechnologyArray(liveDiscovery.technologies)
      : [];

    // Gather content from multiple key pages for richer niche detection
    const keyPages = pages.filter(p =>
      p.pageType === 'homepage' || p.pageType === 'about' || p.pageType === 'services' ||
      p.pageType === 'pricing' || p.pageType === 'features' || p.pageType === 'other'
    ).slice(0, 8);

    const allPageContent = keyPages
      .filter(p => p.contentSummary && p.url !== homepage?.url)
      .map(p => `[${p.pageType || 'page'}] ${p.title || ''}: ${p.contentSummary}`)
      .join('\n');

    const homepageMeta = homepage?.metaTags as any;

    const crawlSummary = {
      websiteUrl: scan.websiteUrl,
      totalPages: pages.length,
      pageTypes,
      urlPatterns,
      homepageContent: {
        title: homepage?.title || null,
        metaDescription: homepageMeta?.description || homepageMeta?.ogDescription || null,
        ogType: homepageMeta?.ogType || null,
        headings: (homepage?.headings as any[]) || [],
        keyContent: homepage?.contentSummary || '',
      },
      allPageContent,
      technologies,
      existingTracking: liveDiscovery?.technologies?.analytics?.map((a: string) => ({
        type: 'analytics',
        provider: a,
      })) || [],
      hasEcommerce: pages.some(p =>
        p.pageType === 'product' || p.pageType === 'checkout' || p.pageType === 'cart'
      ),
      hasForms: pages.some(p => p.hasForm),
      hasVideo: pages.some(p => p.hasVideo),
      hasPhoneNumbers: pages.some(p => p.hasPhoneLink),
    };

    // Run niche detection
    const { detectNiche } = await import('@/lib/site-scanner/services/niche-detector');
    const nicheAnalysis = await detectNiche(crawlSummary as any);

    // Build site map
    const siteMap: Record<string, Array<{ url: string; title: string | null }>> = {};
    for (const page of pages) {
      const type = page.pageType || 'other';
      if (!siteMap[type]) siteMap[type] = [];
      siteMap[type].push({ url: page.url, title: page.title });
    }

    // Check AI availability
    const { getAIAnalysisService } = await import('@/lib/site-scanner/services/ai-analysis');
    const aiAnalysis = getAIAnalysisService();

    // Update scan
    const updated = await prisma.siteScan.update({
      where: { id: scanId },
      data: {
        status: 'NICHE_DETECTED',
        detectedNiche: nicheAnalysis.niche,
        nicheConfidence: nicheAnalysis.confidence,
        nicheSignals: nicheAnalysis.signals as any,
        nicheSubCategory: nicheAnalysis.subCategory,
        detectedTechnologies: technologies as any,
        existingTracking: crawlSummary.existingTracking as any,
        siteMap: siteMap as any,
        aiAnalysisUsed: aiAnalysis.isAvailable,
      },
    });

    return NextResponse.json({
      ...updated,
      nicheAnalysis,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Detect niche failed:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildTechnologyArray(techSummary: any): Array<{ name: string; category: string; confidence: number }> {
  const techs: Array<{ name: string; category: string; confidence: number }> = [];
  if (techSummary.cms) techs.push({ name: techSummary.cms, category: 'cms', confidence: 0.9 });
  if (techSummary.framework) techs.push({ name: techSummary.framework, category: 'framework', confidence: 0.9 });
  if (techSummary.ecommerce) techs.push({ name: techSummary.ecommerce, category: 'other', confidence: 0.9 });
  if (techSummary.cdn) techs.push({ name: techSummary.cdn, category: 'other', confidence: 0.8 });
  for (const a of techSummary.analytics || []) {
    techs.push({ name: a, category: 'analytics', confidence: 0.9 });
  }
  return techs;
}
