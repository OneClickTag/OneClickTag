// POST /api/customers/[id]/scans/[scanId]/finalize
// Called after all Phase 2 chunks complete to run readiness scoring

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
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (scan.status !== 'DEEP_CRAWLING' && scan.status !== 'ANALYZING') {
      return NextResponse.json(
        { error: `Cannot finalize in status: ${scan.status}` },
        { status: 400 }
      );
    }

    await prisma.siteScan.update({
      where: { id: scanId },
      data: { status: 'ANALYZING' },
    });

    // Get all recommendations
    const recommendations = await prisma.trackingRecommendation.findMany({
      where: { scanId },
    });

    // Get all pages
    const pages = await prisma.scanPage.findMany({
      where: { scanId },
    });

    // Calculate readiness score
    const counts = { CRITICAL: 0, IMPORTANT: 0, RECOMMENDED: 0, OPTIONAL: 0 };
    for (const rec of recommendations) {
      const key = rec.severity as keyof typeof counts;
      if (key in counts) counts[key]++;
    }

    const criticalScore = Math.min(counts.CRITICAL * 10, 40);
    const importantScore = Math.min(counts.IMPORTANT * 6, 30);
    const recommendedScore = Math.min(counts.RECOMMENDED * 4, 20);
    const optionalScore = Math.min(counts.OPTIONAL * 2, 10);
    const readinessScore = Math.min(100, criticalScore + importantScore + recommendedScore + optionalScore);

    // Build narrative
    const parts: string[] = [];
    if (counts.CRITICAL > 0) parts.push(`${counts.CRITICAL} critical conversion${counts.CRITICAL > 1 ? 's' : ''}`);
    if (counts.IMPORTANT > 0) parts.push(`${counts.IMPORTANT} important micro-conversion${counts.IMPORTANT > 1 ? 's' : ''}`);
    parts.push(`${recommendations.length} total tracking opportunities`);

    let assessment: string;
    if (readinessScore >= 80) assessment = 'Excellent tracking potential.';
    else if (readinessScore >= 60) assessment = 'Good tracking potential with room for improvement.';
    else if (readinessScore >= 40) assessment = 'Moderate tracking potential. Consider adding more conversion points.';
    else assessment = 'Basic tracking setup. The site would benefit from more conversion-focused elements.';

    const readinessNarrative = `Found ${parts.join(', ')}. ${assessment}`;

    // Calculate page importance
    const typeScores: Record<string, number> = {
      checkout: 1.0, cart: 0.9, pricing: 0.85, contact: 0.8,
      demo: 0.8, signup: 0.8, product: 0.7, services: 0.6,
      homepage: 0.5, about: 0.3, blog: 0.2, faq: 0.2, terms: 0.1, other: 0.15,
    };

    for (const page of pages) {
      let score = typeScores[page.pageType || 'other'] || 0.15;
      if (page.hasForm) score += 0.2;
      if (page.hasCTA) score += 0.1;
      if (page.hasPhoneLink) score += 0.15;
      if (page.hasEmailLink) score += 0.1;

      const pageRecs = recommendations.filter(r => r.pageUrl === page.url);
      score += pageRecs.filter(r => r.severity === 'CRITICAL').length * 0.15;
      score += pageRecs.filter(r => r.severity === 'IMPORTANT').length * 0.08;
      score *= 1 - (page.depth * 0.1);
      score = Math.min(1, Math.max(0, score));

      await prisma.scanPage.update({
        where: { id: page.id },
        data: { importanceScore: score },
      });
    }

    // Mark scan as completed
    const updated = await prisma.siteScan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
        totalRecommendations: recommendations.length,
        trackingReadinessScore: readinessScore,
        readinessNarrative,
        recommendationCounts: {
          critical: counts.CRITICAL,
          important: counts.IMPORTANT,
          recommended: counts.RECOMMENDED,
          optional: counts.OPTIONAL,
        } as any,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Finalize scan failed:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
