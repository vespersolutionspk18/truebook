import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function GET() {
  try {
    // Check if database is initialized
    if (!db) {
      console.error('Database client is not initialized');
      return new NextResponse(JSON.stringify({ error: 'Database connection not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Get user settings from database
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: {
          name: true,
          email: true,
          settings: true
        }
      });

      // Return session data with default settings if user not found
      if (!user) {
        return new NextResponse(JSON.stringify({
          name: session.user.name || '',
          email: session.user.email,
          notifications: true,
          emailUpdates: true,
          darkMode: false
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Return user settings with defaults if not set
      return new NextResponse(JSON.stringify({
        name: user.name || '',
        email: user.email,
        notifications: user.settings?.notifications ?? true,
        emailUpdates: user.settings?.emailUpdates ?? true,
        darkMode: user.settings?.darkMode ?? false
      }), {
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
    console.error('Error fetching user settings:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
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
    if (typeof data.notifications !== 'boolean' || 
        typeof data.emailUpdates !== 'boolean' || 
        typeof data.darkMode !== 'boolean') {
      return new NextResponse(JSON.stringify({ error: 'Invalid settings format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle password change if provided
    if (data.currentPassword || data.newPassword) {
      if (!data.currentPassword || !data.newPassword) {
        return new NextResponse(JSON.stringify({ error: 'Both current and new password are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get user with password
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { password: true }
      });

      if (!user?.password) {
        return new NextResponse(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValidPassword) {
        return new NextResponse(JSON.stringify({ error: 'Current password is incorrect' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      data.password = hashedPassword;
    }

    // Update user settings in database
    const updatedUser = await db.user.update({
      where: { email: session.user.email },
      data: {
        name: data.name,
        ...(data.password && { password: data.password }),
        settings: {
          upsert: {
            create: {
              notifications: data.notifications,
              emailUpdates: data.emailUpdates,
              darkMode: data.darkMode
            },
            update: {
              notifications: data.notifications,
              emailUpdates: data.emailUpdates,
              darkMode: data.darkMode
            }
          }
        }
      },
      select: {
        name: true,
        email: true,
        settings: true
      }
    });

    return new NextResponse(JSON.stringify({
      name: updatedUser.name,
      email: updatedUser.email,
      notifications: updatedUser.settings?.notifications ?? true,
      emailUpdates: updatedUser.settings?.emailUpdates ?? true,
      darkMode: updatedUser.settings?.darkMode ?? false
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    
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