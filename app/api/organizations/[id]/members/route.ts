import { NextRequest, NextResponse } from 'next/server';
import { requireOrganization, requireOrgRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/organizations/[id]/members - List organization members
export const GET = requireOrganization(
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      const members = await db.organizationUser.findMany({
        where: {
          organizationId: id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });

      return NextResponse.json(members);
    } catch (error) {
      logger.error('Failed to fetch organization members', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);

// PATCH /api/organizations/[id]/members/[userId] - Update member role
export const PATCH = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { userId, role } = body;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      // Validate role
      if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }

      // Can't change owner role
      const member = await db.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId,
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        );
      }

      if (member.role === 'OWNER') {
        return NextResponse.json(
          { error: 'Cannot change owner role' },
          { status: 403 }
        );
      }

      // Update role
      const updatedMember = await db.organizationUser.update({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId,
          },
        },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          organizationId: id,
          userId: context.user.id,
          action: 'member.role_updated',
          resource: userId,
          metadata: {
            oldRole: member.role,
            newRole: role,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      logger.info('Member role updated', {
        organizationId: id,
        targetUserId: userId,
        newRole: role,
        updatedBy: context.user.id,
      });

      return NextResponse.json(updatedMember);
    } catch (error) {
      logger.error('Failed to update member role', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);

// DELETE /api/organizations/[id]/members/[userId] - Remove member
export const DELETE = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const url = new URL(req.url);
      const userId = url.pathname.split('/').pop();

      if (!userId) {
        return new NextResponse('User ID required', { status: 400 });
      }

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      // Can't remove owner
      const member = await db.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId,
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        );
      }

      if (member.role === 'OWNER') {
        return NextResponse.json(
          { error: 'Cannot remove organization owner' },
          { status: 403 }
        );
      }

      // Users can remove themselves
      if (userId !== context.user.id && context.organization.role === 'MEMBER') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Remove member
      await db.organizationUser.delete({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId,
          },
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          organizationId: id,
          userId: context.user.id,
          action: userId === context.user.id ? 'member.left' : 'member.removed',
          resource: userId,
          metadata: {
            removedRole: member.role,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      logger.info('Member removed from organization', {
        organizationId: id,
        removedUserId: userId,
        removedBy: context.user.id,
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      logger.error('Failed to remove member', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);