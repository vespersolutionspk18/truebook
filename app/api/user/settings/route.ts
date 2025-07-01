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
      // Get user settings from database
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: {
          name: true,
          email: true,
          image: true,
          settings: true
        }
      });

      // Return session data with default settings if user not found
      if (!user) {
        return new NextResponse(JSON.stringify({
          name: session.user.name || '',
          email: session.user.email,
          avatar: session.user.image || null,
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
        avatar: user.image || null,
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = request.headers.get('content-type');
    let data: {
      name?: string;
      email?: string;
      notifications?: boolean;
      emailUpdates?: boolean;
      darkMode?: boolean;
      currentPassword?: string;
      newPassword?: string;
      avatar?: string;
      password?: string;
    };
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle form data with file upload
      const formData = await request.formData();
      data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        notifications: formData.get('notifications') === 'true',
        emailUpdates: formData.get('emailUpdates') === 'true',
        darkMode: formData.get('darkMode') === 'true',
        currentPassword: formData.get('currentPassword') as string,
        newPassword: formData.get('newPassword') as string,
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
        ...(data.avatar && { image: data.avatar }),
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
        image: true,
        settings: true
      }
    });

    return new NextResponse(JSON.stringify({
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.image || null,
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