import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { clearFeatureFlagCache, FEATURE_FLAGS } from '@/lib/feature-flags';

const updateOrgFeatureFlagSchema = z.object({
  featureFlagKey: z.string(),
  enabled: z.boolean(),
  metadata: z.any().optional(),
});

// GET /api/organizations/[id]/feature-flags - Get organization feature flag overrides
export const GET = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      // Get all feature flags with organization overrides
      const flags = await db.featureFlag.findMany({
        include: {
          organizationFlags: {
            where: { organizationId: id },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Format response
      const response = flags.map(flag => ({
        id: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description,
        defaultEnabled: flag.defaultEnabled,
        enabledForAll: flag.enabledForAll,
        percentage: flag.percentage,
        organizationOverride: flag.organizationFlags[0] || null,
      }));

      return NextResponse.json(response);
    } catch (error) {
      logger.error('Failed to fetch organization feature flags', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);

// POST /api/organizations/[id]/feature-flags - Set organization feature flag override
export const POST = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      const body = await req.json();
      const validatedData = updateOrgFeatureFlagSchema.parse(body);

      // Find the feature flag
      const flag = await db.featureFlag.findUnique({
        where: { key: validatedData.featureFlagKey },
      });

      if (!flag) {
        return NextResponse.json(
          { error: 'Feature flag not found' },
          { status: 404 }
        );
      }

      // Upsert organization override
      const orgFlag = await db.organizationFeatureFlag.upsert({
        where: {
          organizationId_featureFlagId: {
            organizationId: id,
            featureFlagId: flag.id,
          },
        },
        create: {
          organizationId: id,
          featureFlagId: flag.id,
          enabled: validatedData.enabled,
          metadata: validatedData.metadata,
        },
        update: {
          enabled: validatedData.enabled,
          metadata: validatedData.metadata,
        },
      });

      // Clear cache
      await clearFeatureFlagCache(id);

      // Log the change
      await db.auditLog.create({
        data: {
          organizationId: id,
          userId: context.user.id,
          action: 'feature_flag.updated',
          resource: flag.key,
          metadata: {
            enabled: validatedData.enabled,
            previousEnabled: orgFlag.enabled,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      logger.info('Organization feature flag updated', {
        organizationId: id,
        flagKey: flag.key,
        enabled: validatedData.enabled,
        userId: context.user.id,
      });

      return NextResponse.json(orgFlag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }

      logger.error('Failed to update organization feature flag', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);