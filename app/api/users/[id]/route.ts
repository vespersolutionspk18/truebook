import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id: userId } = await params;
    
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Get user with settings
      const user = await db.user.findUnique({
        where: { id: userId },
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
      });

      if (!user) {
        return new NextResponse(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new NextResponse(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return new NextResponse(JSON.stringify({ error: 'Database operation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = params.id;
    
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = request.headers.get('content-type');
    let data: {
      name?: string;
      email?: string;
      role?: string;
      notifications?: boolean;
      emailUpdates?: boolean;
      darkMode?: boolean;
      emailVerified?: boolean;
      avatar?: string;
    };
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle form data with file upload
      const formData = await request.formData();
      data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        role: formData.get('role') as string,
        notifications: formData.get('notifications') === 'true',
        emailUpdates: formData.get('emailUpdates') === 'true',
        darkMode: formData.get('darkMode') === 'true',
        emailVerified: formData.get('emailVerified') === 'true',
      };
      
      const avatarFile = formData.get('avatar') as File;
      if (avatarFile && avatarFile.size > 0) {
        // Convert file to base64 for storage
        const bytes = await avatarFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        data.avatar = `data:${avatarFile.type};base64,${buffer.toString('base64')}`;
      }
    } else {
      // Handle JSON data
      data = await request.json();
    }

    // Validate input data
    if (!data || typeof data !== 'object') {
      return new NextResponse(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate role if provided
    const validRoles = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (data.role && !validRoles.includes(data.role)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid role specified' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return new NextResponse(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update user in database
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        ...(data.role && { role: data.role }),
        ...(data.avatar && { image: data.avatar }),
        ...(data.emailVerified !== undefined && { 
          emailVerified: data.emailVerified ? new Date() : null 
        }),
        settings: {
          upsert: {
            create: {
              notifications: data.notifications ?? true,
              emailUpdates: data.emailUpdates ?? true,
              darkMode: data.darkMode ?? false
            },
            update: {
              notifications: data.notifications ?? true,
              emailUpdates: data.emailUpdates ?? true,
              darkMode: data.darkMode ?? false
            }
          }
        }
      },
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
    });

    return new NextResponse(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2025':
          return new NextResponse(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        case 'P2002':
          return new NextResponse(JSON.stringify({ error: 'Email already exists' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        default:
          break;
      }
    }

    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if database is initialized
    if (!db) {
      console.error('Database client is not initialized');
      return new NextResponse(JSON.stringify({ error: 'Database connection not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = params.id;
    
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Check if user exists
      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return new NextResponse(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Prevent users from deleting themselves
      const currentUser = await db.user.findUnique({
        where: { email: session.user.email }
      });

      if (currentUser?.id === userId) {
        return new NextResponse(JSON.stringify({ error: 'Cannot delete your own account' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Delete user (cascade will handle related data)
      await db.user.delete({
        where: { id: userId }
      });

      return new NextResponse(JSON.stringify({ message: 'User deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return new NextResponse(JSON.stringify({ error: 'Database operation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2025':
          return new NextResponse(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        default:
          break;
      }
    }

    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}