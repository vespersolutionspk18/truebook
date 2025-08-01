import { NextRequest, NextResponse } from 'next/server';
import { requireOrganization } from '@/lib/auth';
import { checkFeatureFlags, FEATURE_FLAGS } from '@/lib/feature-flags';
import { logger } from '@/lib/logger';

// GET /api/feature-flags - Get all feature flags for current organization
export const GET = requireOrganization(async (req, context) => {
  try {
    // Get all feature flag keys
    const flagKeys = Object.values(FEATURE_FLAGS);
    
    // Check all flags for this organization
    const flags = await checkFeatureFlags(context.organization.id, flagKeys);
    
    return NextResponse.json(flags);
  } catch (error) {
    logger.error('Failed to fetch feature flags', {
      organizationId: context.organization.id,
      error,
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});