import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Get all users with their settings
      const users = await db.user.findMany({
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return new NextResponse(JSON.stringify(users), {
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
    console.error('Error fetching users:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();

    // Validate input data
    if (!data || typeof data !== 'object') {
      return new NextResponse(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    if (!data.email || !data.name || !data.password) {
      return new NextResponse(JSON.stringify({ error: 'Email, name, and password are required' }), {
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

    // Check if user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return new NextResponse(JSON.stringify({ error: 'User with this email already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user with default settings
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

    return new NextResponse(JSON.stringify(newUser), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2002':
          return new NextResponse(JSON.stringify({ error: 'User with this email already exists' }), {
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