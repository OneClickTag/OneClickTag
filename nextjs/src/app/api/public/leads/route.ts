import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating a lead
const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  email: z.string().email('Invalid email address'),
  purpose: z.string().min(1, 'Purpose is required').max(1000, 'Purpose must be 1000 characters or less'),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service',
  }),
  marketingConsent: z.boolean().optional().default(false),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

/**
 * POST /api/public/leads
 * Create a new lead (early access signup) - Public endpoint, no auth required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = createLeadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if email already exists
    const existingLead = await prisma.lead.findUnique({
      where: { email: data.email },
    });

    if (existingLead) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create the lead with GDPR compliance fields
    const now = new Date();
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        purpose: data.purpose,
        acceptedTerms: data.acceptedTerms,
        acceptedTermsAt: data.acceptedTerms ? now : null,
        marketingConsent: data.marketingConsent || false,
        marketingConsentAt: data.marketingConsent ? now : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        source: data.source,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
      },
    });

    console.log(`New lead created: ${lead.email}`);

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to create lead: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to create lead', message: errorMessage },
      { status: 500 }
    );
  }
}
