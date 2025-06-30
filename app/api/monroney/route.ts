import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const monroneyLabels = await db.monroney.findMany({
      select: {
        id: true,
        vin: true,
        vehicleId: true,
        createdAt: true,
        updatedAt: true,
        monroneyPairs: {
          select: {
            property: true,
            value: true
          }
        }
      }
    });

    if (!monroneyLabels || monroneyLabels.length === 0) {
      return NextResponse.json({ message: 'No Monroney labels found' }, { status: 404 });
    }

    return NextResponse.json(monroneyLabels);
  } catch (error) {
    console.error('Error fetching Monroney labels:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: 'Database error: ' + error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: 'An unexpected error occurred while fetching Monroney labels' },
      { status: 500 }
    );
  }
}