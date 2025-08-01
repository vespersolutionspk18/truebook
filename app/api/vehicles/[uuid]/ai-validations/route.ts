import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrganization } from '@/lib/auth';

// GET - List all AI validations for a vehicle
export const GET = requireOrganization(async (request: NextRequest, context, { params }: { params: Promise<{ uuid: string }> }) => {
  try {
    const { uuid } = await params;

    // Verify vehicle ownership
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      },
      select: { uuid: true }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Get all AI validations for this vehicle
    const validations = await db.aIValidation.findMany({
      where: {
        vehicleId: uuid
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        provider: true,
        validationType: true,
        outputData: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ validations });

  } catch (error: any) {
    console.error('Error fetching AI validations:', error);
    return NextResponse.json({
      error: 'Failed to fetch AI validations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});