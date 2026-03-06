// POST /api/internal/process-queue
// Internal endpoint for self-chaining queue processing.
// Called by runProcessingLoop when there are remaining jobs after a 25s window.

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { runProcessingLoop } from '@/lib/queue/process-job';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // Simple auth: only accept calls with our internal secret
  const secret = request.headers.get('x-internal-secret');
  const expected = process.env.CRON_SECRET || 'internal';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  waitUntil(runProcessingLoop());

  return NextResponse.json({ success: true, message: 'Processing triggered' });
}
