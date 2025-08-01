import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authContext = await getAuthContext(req);
  
  if (!authContext) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if user has access to this organization
    const orgUser = await db.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: authContext.user.id
        }
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                users: true,
                vehicles: true
              }
            }
          }
        }
      }
    });

    if (!orgUser) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    return NextResponse.json({
      organization: orgUser.organization,
      role: orgUser.role,
      joinedAt: orgUser.joinedAt
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authContext = await getAuthContext(req);
  
  if (!authContext) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Check if user has admin access to this organization
    const orgUser = await db.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: authContext.user.id
        }
      }
    });

    if (!orgUser || !['OWNER', 'ADMIN'].includes(orgUser.role)) {
      return new NextResponse('Insufficient permissions', { status: 403 });
    }

    const updateData: any = {};
    
    if (body.name) updateData.name = body.name;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.settings) updateData.settings = body.settings;

    const organization = await db.organization.update({
      where: { id },
      data: updateData
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId: id,
        userId: authContext.user.id,
        action: 'organization.updated',
        resource: id,
        metadata: updateData,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authContext = await getAuthContext(req);
  
  if (!authContext) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if user is owner of this organization
    const orgUser = await db.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: authContext.user.id
        }
      }
    });

    if (!orgUser || orgUser.role !== 'OWNER') {
      return new NextResponse('Only organization owners can delete organizations', { status: 403 });
    }

    // Check if organization has active subscription
    const org = await db.organization.findUnique({
      where: { id },
      select: { subscriptionStatus: true }
    });

    if (org?.subscriptionStatus === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Please cancel your subscription before deleting the organization' },
        { status: 400 }
      );
    }

    // Delete organization (cascade will handle related records)
    await db.organization.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}