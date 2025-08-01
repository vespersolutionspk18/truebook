import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { clearFeatureFlagCache } from '@/lib/feature-flags';

const createFeatureFlagSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  name: z.string(),
  description: z.string().optional(),
  defaultEnabled: z.boolean().default(false),
  enabledForAll: z.boolean().default(false),
  percentage: z.number().min(0).max(100).optional(),
});

const updateFeatureFlagSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  defaultEnabled: z.boolean().optional(),
  enabledForAll: z.boolean().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
});

// GET /api/admin/feature-flags - List all feature flags (admin only)
export const GET = requireUser(async (req, context) => {
  try {
    // Check if user is admin
    if (context.user.role !== 'SUPERADMIN' && context.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const flags = await db.featureFlag.findMany({
      include: {
        _count: {
          select: { organizationFlags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(flags);
  } catch (error) {
    logger.error('Failed to fetch feature flags', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});

// POST /api/admin/feature-flags - Create a new feature flag (admin only)
export const POST = requireUser(async (req, context) => {
  try {
    // Check if user is admin
    if (context.user.role !== 'SUPERADMIN' && context.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const validatedData = createFeatureFlagSchema.parse(body);

    // Check if flag already exists
    const existing = await db.featureFlag.findUnique({
      where: { key: validatedData.key },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Feature flag with this key already exists' },
        { status: 400 }
      );
    }

    const flag = await db.featureFlag.create({
      data: validatedData,
    });

    logger.info('Feature flag created', {
      userId: context.user.id,
      flagId: flag.id,
      key: flag.key,
    });

    return NextResponse.json(flag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to create feature flag', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});

// PATCH /api/admin/feature-flags/[id] - Update a feature flag
export const PATCH = requireUser(async (req: NextRequest, context, { params }: { params: { id: string } }) => {
  try {
    // Check if user is admin
    if (context.user.role !== 'SUPERADMIN' && context.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateFeatureFlagSchema.parse(body);

    const flag = await db.featureFlag.update({
      where: { id: params.id },
      data: validatedData,
    });

    // Clear cache for all organizations
    const orgs = await db.organization.findMany({ select: { id: true } });
    await Promise.all(orgs.map(org => clearFeatureFlagCache(org.id)));

    logger.info('Feature flag updated', {
      userId: context.user.id,
      flagId: flag.id,
      key: flag.key,
    });

    return NextResponse.json(flag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to update feature flag', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});