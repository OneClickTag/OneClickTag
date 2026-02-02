import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

// Valid cache tags that can be revalidated
const VALID_TAGS = [
  'landing',
  'plans',
  'footer',
  'contact',
  'settings',
  'content',
  'about',
  'terms',
  'privacy',
] as const;

type ValidTag = (typeof VALID_TAGS)[number];

interface RevalidateRequest {
  tags?: string[];
  paths?: string[];
  secret?: string;
}

/**
 * POST /api/revalidate
 *
 * On-demand revalidation endpoint for cache invalidation.
 * Called by the backend when admin updates content.
 *
 * Request body:
 * {
 *   "secret": "your-revalidate-secret",
 *   "tags": ["landing", "plans"],  // Optional: specific cache tags to invalidate
 *   "paths": ["/", "/plans"]       // Optional: specific paths to revalidate
 * }
 *
 * If no tags or paths are provided, all tags will be revalidated.
 */
export async function POST(request: NextRequest) {
  try {
    const body: RevalidateRequest = await request.json();
    const { tags, paths, secret } = body;

    // Verify the secret token
    const expectedSecret = process.env.REVALIDATE_SECRET;

    // If a secret is configured, verify it
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid secret token' },
        { status: 401 }
      );
    }

    // If no secret is configured in dev, allow requests (for easier testing)
    if (!expectedSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Revalidation secret not configured' },
        { status: 500 }
      );
    }

    const revalidated: { tags: string[]; paths: string[] } = {
      tags: [],
      paths: [],
    };

    // Revalidate specific tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        if (VALID_TAGS.includes(tag as ValidTag)) {
          revalidateTag(tag);
          revalidated.tags.push(tag);
        }
      }
    }

    // Revalidate specific paths if provided
    if (paths && Array.isArray(paths) && paths.length > 0) {
      for (const path of paths) {
        if (typeof path === 'string' && path.startsWith('/')) {
          revalidatePath(path);
          revalidated.paths.push(path);
        }
      }
    }

    // If no tags or paths specified, revalidate all tags
    if (
      (!tags || tags.length === 0) &&
      (!paths || paths.length === 0)
    ) {
      for (const tag of VALID_TAGS) {
        revalidateTag(tag);
        revalidated.tags.push(tag);
      }
    }

    return NextResponse.json({
      success: true,
      revalidated,
      message: `Revalidated ${revalidated.tags.length} tags and ${revalidated.paths.length} paths`,
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/revalidate
 *
 * Simple GET endpoint for testing/health check.
 * Does not perform any revalidation.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    availableTags: VALID_TAGS,
    message: 'Use POST with { tags: [...], secret: "..." } to revalidate',
  });
}
