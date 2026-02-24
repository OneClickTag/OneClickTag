// POST /api/customers/[id]/scans/[scanId]/process-chunk
// Client calls this in a loop to process pages in chunks

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

    const body = await request.json().catch(() => ({}));
    const phase: 'phase1' | 'phase2' = body.phase || 'phase1';
    // Phase 1 (Playwright): default 8, cap at 10. Phase 2 (Playwright): default 5, cap at 15.
    const maxChunk = phase === 'phase1' ? 10 : 15;
    const defaultChunk = phase === 'phase1' ? 8 : 5;
    const chunkSize: number = Math.min(body.chunkSize || defaultChunk, maxChunk);

    // Verify scan belongs to customer + tenant
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId },
      select: { id: true, status: true },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const terminalStatuses = ['COMPLETED', 'FAILED', 'CANCELLED'];
    if (terminalStatuses.includes(scan.status)) {
      return NextResponse.json({ error: `Scan is in terminal state: ${scan.status}` }, { status: 400 });
    }

    // Dynamic import to avoid loading heavy deps on every request
    const { processPhase1ChunkPlaywright, processPhase2Chunk } = await import(
      '@/lib/site-scanner/services/chunk-processor'
    );

    if (phase === 'phase1') {
      const credentials = body.credentials || null;
      const result = await processPhase1ChunkPlaywright(scanId, chunkSize, credentials);
      return NextResponse.json(result);
    } else {
      const result = await processPhase2Chunk(scanId, chunkSize);
      return NextResponse.json(result);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Process chunk failed:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
