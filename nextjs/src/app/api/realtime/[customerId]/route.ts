import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

// Server-Sent Events for real-time tracking status updates
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session || !session.tenantId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { customerId } = params;

  // Verify customer belongs to tenant
  const prisma = (await import('@/lib/prisma')).default;
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId: session.tenantId,
    },
  });

  if (!customer) {
    return new Response('Customer not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', customerId })}\n\n`)
      );

      // Poll for tracking status changes
      let lastCheck = new Date();
      const interval = setInterval(async () => {
        try {
          const updatedTrackings = await prisma.tracking.findMany({
            where: {
              customerId,
              tenantId: session.tenantId!,
              updatedAt: { gt: lastCheck },
            },
            select: {
              id: true,
              name: true,
              status: true,
              lastError: true,
              lastSyncAt: true,
            },
          });

          if (updatedTrackings.length > 0) {
            for (const tracking of updatedTrackings) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'tracking_update', tracking })}\n\n`
                )
              );
            }
          }

          lastCheck = new Date();

          // Send heartbeat every 30 seconds
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          console.error('SSE error:', error);
        }
      }, 5000); // Check every 5 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
