import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { EmailTemplateType } from '@prisma/client';

// Template type options with labels
const templateTypes = [
  {
    value: EmailTemplateType.LEAD_WELCOME,
    label: 'Early Access Welcome',
    description: 'Sent when someone applies for early access. Includes questionnaire CTA.',
    variables: ['name', 'email', 'questionnaireUrl', 'siteUrl', 'contactUrl', 'unsubscribeUrl'],
  },
  {
    value: EmailTemplateType.QUESTIONNAIRE_THANK_YOU,
    label: 'Questionnaire Thank You',
    description: 'Sent after a lead completes the questionnaire.',
    variables: ['name', 'email'],
  },
  {
    value: EmailTemplateType.CUSTOM,
    label: 'Custom',
    description: 'Custom template for manual emails.',
    variables: ['name', 'email'],
  },
];

/**
 * GET /api/admin/email-templates/types
 * Get available template types - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    return NextResponse.json(templateTypes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to fetch template types: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch template types', message: errorMessage },
      { status: 500 }
    );
  }
}
