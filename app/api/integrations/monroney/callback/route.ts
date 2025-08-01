import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

const MONRONEY_CLIENT_ID = process.env.MONRONEY_CLIENT_ID!;
const MONRONEY_CLIENT_SECRET = process.env.MONRONEY_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/monroney/callback`;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error('No authenticated user found');
      redirect('/dashboard/integrations?error=unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      redirect('/dashboard/integrations?error=oauth_denied');
    }

    if (!code) {
      console.error('No authorization code received');
      redirect('/dashboard/integrations?error=no_code');
    }

    // Get the code verifier from the cookie
    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get('monroney_code_verifier')?.value;
    
    if (!codeVerifier) {
      console.error('No code verifier found');
      redirect('/dashboard/integrations?error=no_verifier');
    }

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://monroneylabels.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: MONRONEY_CLIENT_ID,
        client_secret: MONRONEY_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for token:', await tokenResponse.text());
      redirect('/dashboard/integrations?error=token_exchange');
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    // Calculate token expiration date (default to 1 hour if expires_in is not provided)
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    // Store or update the credentials in the database
    await db.monroneyCredentials.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      },
    });

    // Clear the code verifier cookie
    cookieStore.delete('monroney_code_verifier');

    // Redirect back to the integrations page with success message
    redirect('/dashboard/integrations?success=true');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    redirect('/dashboard/integrations?error=unknown');
  }
} 