// GET /api/customers/[id]/scans/[scanId]/events - SSE stream for scan progress
// Polls the database and streams status changes to the client.

import { NextRequest } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED'];
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_DURATION = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth can come from query param (EventSource doesn't support headers)
    const token = request.nextUrl.searchParams.get('token');
    let session;

    if (token) {
      // Manually verify token from query param
      const req = new NextRequest(request.url, {
        headers: new Headers({ Authorization: `Bearer ${token}` }),
      });
      session = await getSessionFromRequest(req);
    } else {
      session = await getSessionFromRequest(request);
    }

    requireTenant(session);
    const { id: customerId, scanId } = await params;

    // Verify scan exists and belongs to tenant
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId },
      select: { id: true, status: true },
    });

    if (!scan) {
      return new Response(JSON.stringify({ error: 'Scan not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const startTime = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        let lastStatus = '';
        let lastPageCount = 0;
        let lastRecCount = 0;

        const sendEvent = (type: string, data: Record<string, unknown>) => {
          const payload = JSON.stringify({ type, data: { scanId, ...data } });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };

        // Send initial heartbeat
        controller.enqueue(encoder.encode(': heartbeat\n\n'));

        const poll = async () => {
          try {
            // Check if client disconnected
            if (request.signal.aborted) {
              controller.close();
              return;
            }

            // Check max duration
            if (Date.now() - startTime > MAX_DURATION) {
              sendEvent('scan.timeout', { message: 'Stream timed out' });
              controller.close();
              return;
            }

            const currentScan = await prisma.siteScan.findFirst({
              where: { id: scanId, customerId, tenantId: session.tenantId },
              select: {
                status: true,
                detectedNiche: true,
                nicheConfidence: true,
                nicheSubCategory: true,
                nicheSignals: true,
                totalPagesScanned: true,
                totalRecommendations: true,
                trackingReadinessScore: true,
                readinessNarrative: true,
                detectedTechnologies: true,
                existingTracking: true,
                errorMessage: true,
                _count: { select: { pages: true, recommendations: true } },
              },
            });

            if (!currentScan) {
              controller.close();
              return;
            }

            const pageCount = currentScan._count.pages;
            const recCount = currentScan._count.recommendations;

            // Emit events on status change
            if (currentScan.status !== lastStatus) {
              switch (currentScan.status) {
                case 'CRAWLING':
                  sendEvent('scan.started', { status: 'CRAWLING' });
                  break;
                case 'NICHE_DETECTED':
                case 'AWAITING_CONFIRMATION':
                  sendEvent('scan.niche_detected', {
                    niche: currentScan.detectedNiche,
                    confidence: currentScan.nicheConfidence,
                    subCategory: currentScan.nicheSubCategory,
                    signals: currentScan.nicheSignals,
                    technologies: currentScan.detectedTechnologies,
                    existingTracking: currentScan.existingTracking,
                    pagesScanned: pageCount,
                  });
                  break;
                case 'DEEP_CRAWLING':
                  sendEvent('scan.deep_crawl.progress', {
                    status: 'DEEP_CRAWLING',
                    phase: 'phase2',
                  });
                  break;
                case 'ANALYZING':
                  sendEvent('scan.ai_analyzing', {
                    status: 'ANALYZING',
                    step: 'ai_analysis',
                  });
                  break;
                case 'COMPLETED':
                  sendEvent('scan.completed', {
                    totalRecommendations: currentScan.totalRecommendations,
                    readinessScore: currentScan.trackingReadinessScore,
                  });
                  break;
                case 'FAILED':
                  sendEvent('scan.failed', {
                    error: currentScan.errorMessage || 'Scan failed',
                  });
                  break;
              }
              lastStatus = currentScan.status;
            }

            // Emit page crawl progress (only while still crawling)
            if (pageCount > lastPageCount && currentScan.status === 'CRAWLING') {
              sendEvent('scan.page_crawled', {
                pagesScanned: pageCount,
                totalPages: 50, // Approximate
                percentage: Math.min(95, Math.round((pageCount / 50) * 100)),
              });
              lastPageCount = pageCount;
            }

            // Close stream on terminal status
            if (TERMINAL_STATUSES.includes(currentScan.status)) {
              controller.close();
              return;
            }

            // Continue polling
            setTimeout(poll, POLL_INTERVAL);
          } catch (error) {
            console.error('SSE poll error:', error);
            controller.close();
          }
        };

        // Start polling
        poll();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('SSE setup error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
