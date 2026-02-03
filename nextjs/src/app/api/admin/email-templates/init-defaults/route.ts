import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { initializeDefaultTemplates } from '@/lib/email/email.service';

/**
 * POST /api/admin/email-templates/init-defaults
 * Initialize default email templates - Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    await initializeDefaultTemplates();

    console.log('Default email templates initialized');

    return NextResponse.json({ message: 'Default templates initialized successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to initialize default templates: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to initialize default templates', message: errorMessage },
      { status: 500 }
    );
  }
}
