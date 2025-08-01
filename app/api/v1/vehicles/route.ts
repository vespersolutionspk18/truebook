import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission, checkApiKeyRateLimit } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createVehicleSchema = z.object({
  vin: z.string().min(17).max(17),
  mileage: z.number().int().positive().optional(),
  data: z.record(z.string()).optional(),
});

// GET /api/v1/vehicles - List vehicles
export const GET = requireApiPermission(
  'vehicles.read',
  async (req, context) => {
    try {
      // Check rate limit
      const rateLimit = await checkApiKeyRateLimit(context, 'api');
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimit.limit.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.reset.toISOString(),
            },
          }
        );
      }

      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      const [vehicles, total] = await Promise.all([
        db.vehicle.findMany({
          where: {
            organizationId: context.organization.id,
          },
          include: {
            vehiclePairs: true,
            _count: {
              select: {
                bookouts: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        db.vehicle.count({
          where: {
            organizationId: context.organization.id,
          },
        }),
      ]);

      // Track usage
      await db.usageRecord.create({
        data: {
          organizationId: context.organization.id,
          feature: 'api_vehicle_list',
          metadata: {
            apiKeyId: context.apiKey.id,
            count: vehicles.length,
          },
        },
      });

      return NextResponse.json({
        vehicles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, {
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toISOString(),
        },
      });
    } catch (error) {
      logger.error('API v1 vehicles list error', {
        organizationId: context.organization.id,
        apiKeyId: context.apiKey.id,
        error,
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// POST /api/v1/vehicles - Create vehicle
export const POST = requireApiPermission(
  'vehicles.write',
  async (req, context) => {
    try {
      // Check rate limit
      const rateLimit = await checkApiKeyRateLimit(context, 'vehicleLookup');
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimit.limit.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.reset.toISOString(),
            },
          }
        );
      }

      const body = await req.json();
      const validatedData = createVehicleSchema.parse(body);

      // Check vehicle limits
      const vehicleCount = await db.vehicle.count({
        where: { organizationId: context.organization.id },
      });

      const limits = {
        FREE: 5,
        PRO: 100,
        ENTERPRISE: -1, // unlimited
      };

      const limit = limits[context.organization.plan as keyof typeof limits];
      if (limit !== -1 && vehicleCount >= limit) {
        return NextResponse.json(
          { error: `Vehicle limit reached for ${context.organization.plan} plan` },
          { status: 403 }
        );
      }

      // Check if VIN already exists
      const existingVehicle = await db.vehicle.findUnique({
        where: {
          organizationId_vin: {
            organizationId: context.organization.id,
            vin: validatedData.vin,
          },
        },
      });

      if (existingVehicle) {
        return NextResponse.json(
          { error: 'Vehicle with this VIN already exists' },
          { status: 409 }
        );
      }

      // Create vehicle
      const vehicle = await db.$transaction(async (tx) => {
        const newVehicle = await tx.vehicle.create({
          data: {
            vin: validatedData.vin,
            mileage: validatedData.mileage,
            organizationId: context.organization.id,
            userId: 'api-created', // placeholder
            vehiclePairs: validatedData.data ? {
              create: Object.entries(validatedData.data).map(([key, value]) => ({
                property: key,
                value: String(value),
              })),
            } : undefined,
          },
          include: {
            vehiclePairs: true,
          },
        });

        // Track usage
        await tx.usageRecord.create({
          data: {
            organizationId: context.organization.id,
            feature: 'api_vehicle_create',
            metadata: {
              apiKeyId: context.apiKey.id,
              vin: validatedData.vin,
            },
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            organizationId: context.organization.id,
            userId: 'api-key',
            action: 'vehicle.created',
            resource: newVehicle.uuid,
            metadata: {
              apiKeyId: context.apiKey.id,
              apiKeyName: context.apiKey.name,
              vin: validatedData.vin,
            },
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
          },
        });

        return newVehicle;
      });

      logger.info('Vehicle created via API', {
        organizationId: context.organization.id,
        apiKeyId: context.apiKey.id,
        vehicleId: vehicle.uuid,
        vin: vehicle.vin,
      });

      return NextResponse.json(vehicle, {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }

      logger.error('API v1 vehicle create error', {
        organizationId: context.organization.id,
        apiKeyId: context.apiKey.id,
        error,
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);