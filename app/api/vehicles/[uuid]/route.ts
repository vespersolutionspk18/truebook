import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrganization } from '@/lib/auth';

export const GET = requireOrganization<{ params: Promise<{ uuid: string }> }>(async (req, context, { params }) => {
  try {
    // Await params as required in Next.js 15
    const { uuid } = await params;
    if (!uuid) {
      return new NextResponse('UUID is required', { status: 400 });
    }

    const vehicle = await db.vehicle.findFirst({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      },
      include: {
        vehiclePairs: true,
        monroney: {
          include: {
            monroneyPairs: true
          }
        },
        neoVin: {
          include: {
            interiorColor: true,
            exteriorColor: true,
            rating: true,
            warranty: true,
            installedOptionsDetails: true,
            features: true,
            highValueFeatures: true,
            installedEquipment: true,
          }
        },
        bookouts: {
          include: {
            accessories: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});

export const PATCH = requireOrganization<{ params: Promise<{ uuid: string }> }>(async (req, context, { params }) => {
  try {
    const { uuid } = await params;
    
    if (!uuid) {
      return new NextResponse('UUID is required', { status: 400 });
    }

    const body = await req.json();
    
    const vehicle = await db.vehicle.findFirst({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      }
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    const updateData: { mileage?: number | null } = {};
    if (body.mileage !== undefined) {
      updateData.mileage = body.mileage;
    }
    
    console.log('Updating vehicle with data:', updateData);

    const updatedVehicle = await db.$transaction(async (tx) => {
      const updated = await tx.vehicle.update({
        where: {
          uuid: uuid
        },
        data: updateData
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          userId: context.user.id,
          action: 'vehicle.updated',
          resource: uuid,
          metadata: updateData,
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        }
      });

      return updated;
    });

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});

export const DELETE = requireOrganization<{ params: Promise<{ uuid: string }> }>(async (req, context, { params }) => {
  try {
    const { uuid } = await params;
    if (!uuid) {
      return new NextResponse('UUID is required', { status: 400 });
    }

    const vehicle = await db.vehicle.findFirst({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      }
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.vehicle.delete({
        where: {
          uuid: uuid
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          userId: context.user.id,
          action: 'vehicle.deleted',
          resource: uuid,
          metadata: { vin: vehicle.vin },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        }
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});