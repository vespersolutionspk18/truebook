import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/invitations/[token] - Get invitation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    logger.error('Failed to fetch invitation', { token: params, error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/invitations/[token] - Accept invitation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const authContext = await getAuthContext(req);

    if (!authContext) {
      return new NextResponse('Unauthorized - Please login first', { status: 401 });
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if email matches (if invitation was for specific email)
    if (invitation.email !== authContext.user.email) {
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: authContext.user.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      );
    }

    // Accept invitation in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create organization membership
      const membership = await tx.organizationUser.create({
        data: {
          organizationId: invitation.organizationId,
          userId: authContext.user.id,
          role: invitation.role,
        },
      });

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          userId: authContext.user.id,
          action: 'invitation.accepted',
          resource: invitation.id,
          metadata: {
            role: invitation.role,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return membership;
    });

    logger.info('Invitation accepted', {
      invitationId: invitation.id,
      userId: authContext.user.id,
      organizationId: invitation.organizationId,
    });

    return NextResponse.json({
      message: 'Successfully joined organization',
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
        role: result.role,
      },
    });
  } catch (error) {
    logger.error('Failed to accept invitation', { token: params, error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/invitations/[token] - Cancel invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const authContext = await getAuthContext(req);

    if (!authContext?.organization) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    // Verify user has permission to cancel
    if (invitation.organizationId !== authContext.organization.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!['OWNER', 'ADMIN'].includes(authContext.organization.role)) {
      return new NextResponse('Insufficient permissions', { status: 403 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Cannot cancel an accepted invitation' },
        { status: 400 }
      );
    }

    await db.invitation.delete({
      where: { id: invitation.id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId: authContext.organization.id,
        userId: authContext.user.id,
        action: 'invitation.cancelled',
        resource: invitation.id,
        metadata: {
          email: invitation.email,
        },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    });

    logger.info('Invitation cancelled', {
      invitationId: invitation.id,
      userId: authContext.user.id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Failed to cancel invitation', { token: params, error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}