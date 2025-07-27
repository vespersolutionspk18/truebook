import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET - List all AI validations for a vehicle
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify vehicle ownership
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        userId: user.id
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
}