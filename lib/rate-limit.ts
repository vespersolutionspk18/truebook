import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/redis';

type RateLimitType = keyof typeof rateLimiters;

export async function withRateLimit(
  req: NextRequest,
  type: RateLimitType = 'api',
  identifier?: string
): Promise<NextResponse | null> {
  try {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Skip if Redis is not configured
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return null;
    }

    // Determine identifier
    let id = identifier;
    if (!id) {
      // In middleware, we can't use next-auth, so just use IP/headers
      const orgId = req.headers.get('x-organization-id');
      if (orgId) {
        id = `org:${orgId}`;
      } else {
        // Fall back to IP
        id = req.headers.get('x-forwarded-for') || 
            req.headers.get('x-real-ip') || 
            'anonymous';
      }
    }

    const rateLimiter = rateLimiters[type];
    const { success, limit, reset, remaining } = await rateLimiter.limit(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
            'Retry-After': Math.floor((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to the request for the handler to use
    req.headers.set('X-RateLimit-Limit', limit.toString());
    req.headers.set('X-RateLimit-Remaining', remaining.toString());
    req.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());

    return null;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Don't block requests if rate limiting fails
    return null;
  }
}

// Higher-order function to wrap handlers with rate limiting
export function rateLimited<T extends Record<string, any>>(
  type: RateLimitType,
  handler: (req: NextRequest, params?: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, params?: T) => {
    const rateLimitResponse = await withRateLimit(req, type);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(req, params);
  };
}

