import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrganization } from '@/lib/auth';

// POST - Apply validation session changes to bookout
export const POST = requireOrganization(async (request: NextRequest, context, { params }: { params: Promise<{ uuid: string; sessionId: string }> }) => {
  try {
    const { uuid, sessionId } = await params;

    // Verify vehicle ownership
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      },
      include: {
        bookouts: {
          where: { provider: 'jdpower' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Get session with all overrides
    const session = await db.validationSession.findUnique({
      where: { id: sessionId },
      include: {
        validation: true,
        overrides: true
      }
    });

    if (!session || session.vehicleId !== uuid) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Session has already been applied or cancelled' 
      }, { status: 400 });
    }

    if (new Date() > session.expiresAt) {
      return NextResponse.json({ 
        error: 'Session has expired' 
      }, { status: 400 });
    }

    // No need to check for pending - all overrides default to following build sheet

    // Get current bookout and accessories
    const bookout = vehicle.bookouts[0];
    if (!bookout || bookout.id !== session.bookoutId) {
      return NextResponse.json({ 
        error: 'Bookout has changed since validation. Please re-validate.' 
      }, { status: 400 });
    }

    const currentAccessories = await db.bookoutAccessory.findMany({
      where: { bookoutId: bookout.id }
    });

    // Calculate final accessory selections based on overrides
    const finalSelections = new Set<string>();
    
    // Start with current selections
    currentAccessories.forEach(acc => {
      if (acc.isSelected) {
        finalSelections.add(acc.code);
      }
    });

    // Apply overrides - by default follow build sheet, unless keepJdPower is true
    session.overrides.forEach(override => {
      if (override.keepJdPower) {
        // Keep JD Power selection
        if (override.originalSelected) {
          finalSelections.add(override.accessoryCode);
        } else {
          finalSelections.delete(override.accessoryCode);
        }
      } else {
        // Follow build sheet recommendation
        if (override.aiRecommendation === 'SELECT') {
          finalSelections.add(override.accessoryCode);
        } else if (override.aiRecommendation === 'DESELECT') {
          finalSelections.delete(override.accessoryCode);
        }
      }
    });

    console.log('Final accessory selections:', Array.from(finalSelections));

    // Update bookout using the existing accessory update endpoint
    const accessoryUpdateResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/vehicles/${vehicle.uuid}/bookout/${bookout.id}/accessories`, 
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          selectedAccessoryCodes: Array.from(finalSelections),
          changeTrackingValidationId: session.validationId
        })
      }
    );

    if (!accessoryUpdateResponse.ok) {
      const errorData = await accessoryUpdateResponse.json();
      throw new Error(errorData.error || 'Failed to update accessories');
    }

    const updateResult = await accessoryUpdateResponse.json();

    // Mark session as applied
    await db.validationSession.update({
      where: { id: sessionId },
      data: { 
        status: 'applied',
        appliedAt: new Date()
      }
    });

    // Log the application of changes
    const { BookoutSnapshotManager } = await import('@/lib/bookout-snapshot');
    const snapshotManager = new BookoutSnapshotManager(session.validationId, bookout.id);
    
    // Log each override decision
    for (const override of session.overrides) {
      if (override.keepJdPower) {
        const accessory = currentAccessories.find(a => a.code === override.accessoryCode);
        if (accessory) {
          snapshotManager.logAccessoryChange(
            accessory.id,
            override.accessoryCode,
            override.originalSelected,
            `User override: Kept JD Power selection instead of build sheet recommendation`,
            1.0,
            'USER_OVERRIDE'
          );
        }
      }
    }
    
    await snapshotManager.saveChanges();

    return NextResponse.json({
      message: 'Validation session applied successfully',
      session: {
        id: session.id,
        status: 'applied',
        appliedAt: new Date()
      },
      bookout: updateResult.bookout,
      changes: {
        totalChanges: session.overrides.length,
        keptJdPower: session.overrides.filter(o => o.keepJdPower).length,
        followedBuildSheet: session.overrides.filter(o => !o.keepJdPower).length,
        finalSelections: Array.from(finalSelections).length,
        revaluation: updateResult.revaluation
      }
    });

  } catch (error: any) {
    console.error('Error applying validation session:', error);
    return NextResponse.json({
      error: 'Failed to apply validation session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});