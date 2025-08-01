import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/jobs/queue';

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

// GET /api/organizations/[id]/invitations - List all invitations
export const GET = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      const invitations = await db.invitation.findMany({
        where: {
          organizationId: id,
          acceptedAt: null,
          expiresAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(invitations);
    } catch (error) {
      logger.error('Failed to fetch invitations', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);

// POST /api/organizations/[id]/invitations - Create invitation
export const POST = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      const body = await req.json();
      const validatedData = createInvitationSchema.parse(body);

      // Check if user is already a member
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email },
        include: {
          organizations: {
            where: { organizationId: id },
          },
        },
      });

      if (existingUser?.organizations.length > 0) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        );
      }

      // Check for existing pending invitation
      const existingInvitation = await db.invitation.findFirst({
        where: {
          organizationId: id,
          email: validatedData.email,
          acceptedAt: null,
          expiresAt: {
            gte: new Date(),
          },
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: 'An invitation has already been sent to this email' },
          { status: 400 }
        );
      }

      // Create invitation
      const invitation = await db.invitation.create({
        data: {
          organizationId: id,
          email: validatedData.email,
          role: validatedData.role,
          token: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdBy: context.user.id,
        },
        include: {
          organization: true,
        },
      });

      // Queue invitation email
      const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`;
      await sendEmail({
        to: validatedData.email,
        subject: `You're invited to join ${invitation.organization.name}`,
        template: 'invitation',
        data: {
          inviteUrl,
          organizationName: invitation.organization.name,
          role: validatedData.role,
        },
      });

      logger.info('Invitation created and email queued', {
        organizationId: id,
        invitationId: invitation.id,
        email: validatedData.email,
        role: validatedData.role,
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          organizationId: id,
          userId: context.user.id,
          action: 'invitation.created',
          resource: invitation.id,
          metadata: {
            email: validatedData.email,
            role: validatedData.role,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        ...invitation,
        inviteUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }

      logger.error('Failed to create invitation', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);