import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';

export async function GET(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  try {
    // Await params as required in Next.js 15
    const { uuid } = await params;
    if (!uuid) {
      return new NextResponse('UUID is required', { status: 400 });
    }

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

    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        userId: user.id
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
}

export async function DELETE(request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  try {
    const { uuid } = await params;
    if (!uuid) {
      return new NextResponse('UUID is required', { status: 400 });
    }

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

    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        userId: user.id
      }
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    await db.vehicle.delete({
      where: {
        uuid: uuid
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}