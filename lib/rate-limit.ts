import { NextRequest, NextResponse } from 'next/server';

type RateLimitType = 'api' | 'auth' | 'vehicleLookup';

export async function withRateLimit(
  req: NextRequest,
  type: RateLimitType = 'api',
  identifier?: string
): Promise<NextResponse | null> {
  // Disable rate limiting completely for local development
  return null;
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

