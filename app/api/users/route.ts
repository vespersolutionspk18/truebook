import { NextResponse, NextRequest } from 'next/server';
import { requireOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const GET = requireOrganization(async (req, context) => {
  try {
    // Get only users from the current organization
    const organizationUsers = await db.organizationUser.findMany({
      where: {
        organizationId: context.organization.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
            emailVerified: true,
            settings: {
              select: {
                notifications: true,
                emailUpdates: true,
                darkMode: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    // Transform to include org role
    const users = organizationUsers.map(ou => ({
      ...ou.user,
      organizationRole: ou.role,
      joinedAt: ou.joinedAt
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = requireOrganization(async (req, context) => {
  try {
    const data = await req.json();

    // Validate input data
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Validate required fields
    if (!data.email || !data.name || !data.password) {
      return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
    }

    // Validate role if provided
    const validRoles = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (data.role && !validRoles.includes(data.role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Validate organization role
    const validOrgRoles = ['OWNER', 'ADMIN', 'MEMBER'];
    const organizationRole = data.organizationRole || 'MEMBER';
    if (!validOrgRoles.includes(organizationRole)) {
      return NextResponse.json({ error: 'Invalid organization role specified' }, { status: 400 });
    }

    // Check if user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email }
    });

    let userId: string;

    if (existingUser) {
      // User exists, check if already in organization
      const existingMembership = await db.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: context.organization.id
          }
        }
      });

      if (existingMembership) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 });
      }

      userId = existingUser.id;
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const newUser = await db.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
          role: data.role || 'EMPLOYEE',
          settings: {
            create: {
              notifications: true,
              emailUpdates: true,
              darkMode: false
            }
          }
        }
      });
      userId = newUser.id;
    }

    // Add user to organization
    await db.organizationUser.create({
      data: {
        userId,
        organizationId: context.organization.id,
        role: organizationRole
      }
    });

    // Fetch the complete user data
    const orgUser = await db.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: context.organization.id
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
            emailVerified: true,
            settings: {
              select: {
                notifications: true,
                emailUpdates: true,
                darkMode: true
              }
            }
          }
        }
      }
    });

    const userWithOrgRole = {
      ...orgUser!.user,
      organizationRole: orgUser!.role,
      joinedAt: orgUser!.joinedAt
    };

    return NextResponse.json(userWithOrgRole, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2002':
          return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        default:
          break;
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});