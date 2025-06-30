import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';

export async function POST(request: Request) {
  try {
    // Ensure database is initialized
    if (!db) {
      console.error('Database client is not initialized');
      return NextResponse.json(
        { error: 'Database connection not available. Please try again later.' },
        { status: 503 }
      );
    }

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from email
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const data = await request.json();
    const { vehicleId, vin, monroneyData } = data;

    if (!vehicleId || !vin || !monroneyData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify vehicle ownership
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: vehicleId,
        userId: user.id
      }
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found or unauthorized' },
        { status: 404 }
      );
    }

    // Validate input data structure
    if (!monroneyData || typeof monroneyData !== 'object') {
      return NextResponse.json(
        { error: 'Invalid Monroney data structure' },
        { status: 400 }
      );
    }

    // Create or update Monroney record with explicit type checking
    try {
      const monroney = await db.monroney.upsert({
        where: {
          vehicleId: vehicleId
        },
        create: {
          vin,
          vehicle: {
            connect: {
              uuid: vehicleId
            }
          },
          monroneyPairs: {
            create: Object.entries(monroneyData).map(([property, value]) => ({
              property,
              value: String(value)
            }))
          }
        },
        update: {
          monroneyPairs: {
            deleteMany: {},
            create: Object.entries(monroneyData).map(([property, value]) => ({
              property,
              value: String(value)
            }))
          }
        },
        include: {
          monroneyPairs: true
        }
      });

      return NextResponse.json(monroney);
    } catch (error) {
      throw error;
    }
  } catch (error) {
    // Initialize error data with safely accessed properties
    let errorData = {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };
    
    // Only try to access user and data if they are defined in this scope
    if (typeof user !== 'undefined') {
      errorData = { ...errorData, userId: user.id };
    }
    
    if (typeof data !== 'undefined') {
      try {
        errorData = {
          ...errorData,
          requestData: {
            vehicleId: data.vehicleId,
            vin: data.vin,
            monroneyDataStructure: data.monroneyData ? Object.keys(data.monroneyData) : undefined
          }
        };
      } catch {}
    }
    
    console.error('Error saving Monroney data:', errorData);

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PrismaClientKnownRequestError') {
      if ('code' in error) {
        switch (error.code) {
          case 'P2002':
            return NextResponse.json(
              { error: 'A Monroney record already exists for this vehicle' },
              { status: 409 }
            );
          case 'P2003':
            return NextResponse.json(
              { error: 'The specified vehicle does not exist' },
              { status: 404 }
            );
        }
      }
    }

    // Handle validation and general errors
    if (error instanceof Error) {
      if (error.message.includes('Validation')) {
        return NextResponse.json(
          { error: 'Invalid data format' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while saving Monroney data' },
      { status: 500 }
    );
  }
}