import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { getBookoutComparison } from '@/lib/bookout-snapshot';

// GET - Get before/after comparison data for a validation
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

    // Verify validation belongs to this vehicle
    const validation = await db.aIValidation.findFirst({
      where: {
        id: validationId,
        vehicleId: uuid
      },
      include: {
        snapshot: true,
        changeLogs: {
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!validation) {
      return NextResponse.json({ error: 'AI validation not found' }, { status: 404 });
    }

    // Get comprehensive comparison data
    const comparisonData = await getBookoutComparison(validationId);

    // Format response for frontend consumption
    const response = {
      validation: {
        id: validation.id,
        provider: validation.provider,
        validationType: validation.validationType,
        createdAt: validation.createdAt,
        outputData: validation.outputData
      },
      original: {
        bookout: comparisonData.original.bookout,
        accessories: comparisonData.original.accessories,
        metadata: comparisonData.original.metadata
      },
      current: {
        bookout: comparisonData.current.bookout,
        accessories: comparisonData.current.accessories
      },
      differences: comparisonData.differences,
      changes: {
        total: comparisonData.changes.length,
        byType: comparisonData.changesByType,
        timeline: comparisonData.changes.map(change => ({
          sequence: change.sequence,
          changeType: change.changeType,
          entityType: change.entityType,
          entityCode: change.entityCode,
          fieldName: change.fieldName,
          beforeValue: change.beforeValue,
          afterValue: change.afterValue,
          valueDifference: change.valueDifference,
          reason: change.reason,
          confidence: change.confidence,
          aiValidationStatus: change.aiValidationStatus,
          createdAt: change.createdAt
        }))
      },
      summary: {
        ...comparisonData.summary,
        hasSnapshot: !!validation.snapshot,
        snapshotCreatedAt: validation.snapshot?.createdAt,
        significantChanges: comparisonData.summary.valueImpact !== 0 || comparisonData.summary.accessoryChanges > 0
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching validation comparison:', error);
    return NextResponse.json({
      error: 'Failed to fetch validation comparison',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Restore bookout to original state from snapshot
export async function POST(
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

    // Get validation with snapshot
    const validation = await db.aIValidation.findFirst({
      where: {
        id: validationId,
        vehicleId: uuid
      },
      include: {
        snapshot: true
      }
    });

    if (!validation || !validation.snapshot) {
      return NextResponse.json({ error: 'Validation or snapshot not found' }, { status: 404 });
    }

    // Restore from snapshot
    const { restoreBookoutFromSnapshot } = await import('@/lib/bookout-snapshot');
    await restoreBookoutFromSnapshot(validation.snapshot.id);

    // Log the restoration
    const restorationLog = await db.bookoutChangeLog.create({
      data: {
        validationId: validationId,
        bookoutId: validation.bookoutId!,
        changeType: 'bookout_revalued',
        entityType: 'bookout',
        fieldName: 'restore_from_snapshot',
        reason: 'user_requested_restoration',
        sequence: 999, // High sequence number to indicate it's a restoration
        beforeValue: 'modified_state',
        afterValue: 'original_snapshot_state'
      }
    });

    return NextResponse.json({
      message: 'Bookout successfully restored to original state',
      restoredFrom: {
        snapshotId: validation.snapshot.id,
        snapshotCreatedAt: validation.snapshot.createdAt,
        snapshotReason: validation.snapshot.reason
      },
      restorationLog: {
        id: restorationLog.id,
        createdAt: restorationLog.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error restoring bookout from snapshot:', error);
    return NextResponse.json({
      error: 'Failed to restore bookout from snapshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}