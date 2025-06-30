import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { vin: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Check if vehicle exists by VIN
    const vehicle = await db.vehicle.findFirst({
      where: {
        userId: user.id,
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