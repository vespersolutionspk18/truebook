import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrganization } from '@/lib/auth';

// GET - Get validation session details with overrides
export const GET = requireOrganization(async (request: NextRequest, context, { params }: { params: Promise<{ uuid: string; sessionId: string }> }) => {
  try {
    const { uuid, sessionId } = await params;

    // Verify vehicle ownership and get session
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Get session with validation and overrides
    const session = await db.validationSession.findUnique({
      where: { id: sessionId },
      include: {
        validation: true,
        overrides: {
          orderBy: { accessoryName: 'asc' }
        }
      }
    });

    if (!session || session.vehicleId !== uuid) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if session has expired
    const isExpired = new Date() > session.expiresAt;

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        isExpired,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        appliedAt: session.appliedAt,
        validation: {
          id: session.validation.id,
          provider: session.validation.provider,
          createdAt: session.validation.createdAt
        },
        overrides: session.overrides.map(override => ({
          id: override.id,
          accessoryCode: override.accessoryCode,
          accessoryName: override.accessoryName,
          aiRecommendation: override.aiRecommendation,
          originalSelected: override.originalSelected,
          keepJdPower: override.keepJdPower
        })),
        summary: {
          totalChanges: session.overrides.length,
          keepingJdPower: session.overrides.filter(o => o.keepJdPower).length,
          followingBuildSheet: session.overrides.filter(o => !o.keepJdPower).length,
          buildSheetAdds: session.overrides.filter(o => o.aiRecommendation === 'SELECT').length,
          buildSheetRemoves: session.overrides.filter(o => o.aiRecommendation === 'DESELECT').length
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching validation session:', error);
    return NextResponse.json({
      error: 'Failed to fetch validation session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// PATCH - Toggle override for an accessory
export const PATCH = requireOrganization(async (request: NextRequest, context, { params }: { params: Promise<{ uuid: string; sessionId: string }> }) => {
  try {
    const { uuid, sessionId } = await params;
    const body = await request.json();
    const { accessoryCode } = body;

    if (!accessoryCode) {
      return NextResponse.json({ 
        error: 'accessoryCode is required' 
      }, { status: 400 });
    }

    // Verify vehicle ownership
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Get session and verify it's still pending and not expired
    const session = await db.validationSession.findUnique({
      where: { id: sessionId }
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

    // Get current override state
    let currentOverride = await db.accessoryOverride.findUnique({
      where: {
        sessionId_accessoryCode: {
          sessionId: sessionId,
          accessoryCode: accessoryCode
        }
      }
    });

    let updatedOverride;

    if (!currentOverride) {
      // This should not happen anymore since we create all overrides upfront
      return NextResponse.json({ 
        error: 'Override record not found. Please re-run validation.' 
      }, { status: 404 });
    }
    
    // Toggle the keepJdPower flag
    updatedOverride = await db.accessoryOverride.update({
      where: {
        sessionId_accessoryCode: {
          sessionId: sessionId,
          accessoryCode: accessoryCode
        }
      },
      data: {
        keepJdPower: !currentOverride.keepJdPower
      }
    });

    return NextResponse.json({
      message: 'Override toggled successfully',
      override: {
        accessoryCode: updatedOverride.accessoryCode,
        accessoryName: updatedOverride.accessoryName,
        keepJdPower: updatedOverride.keepJdPower
      }
    });

  } catch (error: any) {
    console.error('Error updating override:', error);
    return NextResponse.json({
      error: 'Failed to update override',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});