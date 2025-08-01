import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';
import type { AuthContext } from '@/lib/auth';
import { db } from '@/lib/db';

type RateLimitType = 'api' | 'auth' | 'vehicleLookup';

// Rate limiting with authentication for API routes
export function requireAuthWithRateLimit<T extends Record<string, any>>(
  type: RateLimitType,
  handler: (req: NextRequest, context: AuthContext, params?: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, params?: T) => {
    // First check auth to get user/org context
    const authContext = await getAuthContext(req);
    if (!authContext) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Then apply rate limiting with proper identifier
    const identifier = authContext.organization 
      ? `org:${authContext.organization.id}`
      : `user:${authContext.user.id}`;
      
    const rateLimitResponse = await withRateLimit(req, type, identifier);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(req, authContext, params);
  };
}

// API key authentication with permission checking
export function requireApiPermission(permission: string) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Missing API key', { status: 401 });
    }
    
    const apiKey = authHeader.substring(7);
    
    const key = await db.apiKey.findUnique({
      where: { key: apiKey },
      include: { organization: true }
    });
    
    if (!key || (key.expiresAt && key.expiresAt < new Date())) {
      return new NextResponse('Invalid API key', { status: 401 });
    }
    
    // Check permissions
    if (!key.permissions.includes('*') && !key.permissions.includes(permission)) {
      return new NextResponse('Insufficient permissions', { status: 403 });
    }
    
    // Update last used
    await db.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() }
    });
    
    return { apiKey: key, organization: key.organization };
  };
}

// Check API key rate limit
export async function checkApiKeyRateLimit(apiKey: string) {
  const rateLimitResponse = await withRateLimit(
    new Request('http://localhost'), 
    'api', 
    `apikey:${apiKey}`
  );
  
  return rateLimitResponse;
}