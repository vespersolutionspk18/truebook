import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET - Get specific AI validation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string; validationId: string }> }
) {
  try {
    const { uuid, validationId } = await params;
    
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

    // Get specific AI validation
    const validation = await db.aIValidation.findUnique({
      where: {
        id: validationId,
        vehicleId: uuid
      }
    });

    if (!validation) {
      return NextResponse.json({ error: 'AI validation not found' }, { status: 404 });
    }

    return NextResponse.json({ validation });

  } catch (error: any) {
    console.error('Error fetching AI validation:', error);
    return NextResponse.json({
      error: 'Failed to fetch AI validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete specific AI validation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uuid: string; validationId: string }> }
) {
  try {
    const { uuid, validationId } = await params;
    
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

    // Delete the AI validation
    const deletedValidation = await db.aIValidation.delete({
      where: {
        id: validationId,
        vehicleId: uuid
      }
    });

    return NextResponse.json({ 
      message: 'AI validation deleted successfully',
      deletedValidation: {
        id: deletedValidation.id,
        createdAt: deletedValidation.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error deleting AI validation:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'AI validation not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      error: 'Failed to delete AI validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}