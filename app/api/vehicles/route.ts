import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

export async function GET() {
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

    // Get user's vehicles
    const vehicles = await db.vehicle.findMany({
      where: {
        userId: user.id
      },
      include: {
        vehiclePairs: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { vin, vehiclePairs } = await req.json();

    if (!vin || !vehiclePairs || !Array.isArray(vehiclePairs)) {
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get user ID from email
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Validate and sanitize vehiclePairs data
    const sanitizedPairs = vehiclePairs
      .filter(pair => 
        pair && 
        typeof pair.property === 'string' && 
        (typeof pair.value === 'string' || typeof pair.value === 'number') && 
        pair.property.trim() !== ''
      )
      .map(pair => ({
        property: pair.property.trim(),
        value: pair.value ? pair.value.toString().trim() : ''
      }));

    if (sanitizedPairs.length === 0) {
      return NextResponse.json(
        { message: 'No valid vehicle data provided' },
        { status: 400 }
      );
    }

    // Create vehicle with pairs in a transaction
    const vehicle = await db.$transaction(async (tx) => {
      // Check if VIN already exists
      const existingVehicle = await tx.vehicle.findUnique({
        where: { vin }
      });
    
      if (existingVehicle) {
        throw new Error('Vehicle with this VIN already exists');
      }
    
      // Create vehicle with all valid pairs
      const vehicleData = {
        vin,
        userId: user.id,
        vehiclePairs: {
          create: sanitizedPairs
        }
      };

      return await tx.vehicle.create({
        data: vehicleData,
        include: {
          vehiclePairs: true
        }
      });
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    if (error instanceof Error) {
      const status = error.message === 'Vehicle with this VIN already exists' ? 409 : 500;
      return NextResponse.json(
        { message: error.message },
        { status }
      );
    }
    return NextResponse.json(
      { message: 'An unexpected error occurred while creating the vehicle' },
      { status: 500 }
    );
  }
}