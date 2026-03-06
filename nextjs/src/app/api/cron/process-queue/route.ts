import { NextRequest, NextResponse } from 'next/server';
import { runProcessingLoop } from '@/lib/queue/process-job';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    await runProcessingLoop();
    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] process-queue error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
