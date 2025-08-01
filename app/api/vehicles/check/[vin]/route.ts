import { NextRequest, NextResponse } from 'next/server';
import { requireOrganization } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = requireOrganization(
  async (req: NextRequest, context, { params }: { params: { vin: string } }) => {
    try {
      // Check if vehicle exists by VIN in the organization
      const vehicle = await db.vehicle.findFirst({
        where: {
          organizationId: context.organization.id,
          vin: params.vin.toUpperCase()
        },
        include: {
          vehiclePairs: true
        }
      });

      if (!vehicle) {
        return NextResponse.json(null);
      }

      return NextResponse.json(vehicle);
    } catch (error) {
      console.error('Error checking vehicle:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);