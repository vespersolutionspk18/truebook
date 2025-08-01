import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

export async function GET(req: NextRequest) {
  const authContext = await getAuthContext(req);
  
  if (!authContext) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const organizations = await db.organizationUser.findMany({
      where: {
        userId: authContext.user.id
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
            createdAt: true,
            _count: {
              select: {
                users: true,
                vehicles: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authContext = await getAuthContext(req);
  
  if (!authContext) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createOrganizationSchema.parse(body);

    // Check if slug is already taken
    const existingOrg = await db.organization.findUnique({
      where: { slug: validatedData.slug }
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 400 }
      );
    }

    // Create organization and add user as owner
    const organization = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: validatedData.name,
          slug: validatedData.slug,
          plan: 'FREE'
        }
      });

      await tx.organizationUser.create({
        data: {
          organizationId: org.id,
          userId: authContext.user.id,
          role: 'OWNER'
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          userId: authContext.user.id,
          action: 'organization.created',
          resource: org.id,
          metadata: {
            name: org.name,
            slug: org.slug
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        }
      });

      return org;
    });

    return NextResponse.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating organization:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}