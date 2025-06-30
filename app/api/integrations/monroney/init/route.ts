import { NextResponse } from 'next/server';
import { generatePKCEChallenge } from '@/lib/pkce';
import { cookies } from 'next/headers';

const MONRONEY_CLIENT_ID = process.env.MONRONEY_CLIENT_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/monroney/callback`;

export async function POST() {
  try {
    // Generate PKCE challenge and verifier
    const { codeChallenge, codeVerifier } = await generatePKCEChallenge();

    // Store the code verifier in a secure cookie
    cookies().set('monroney_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5 // 5 minutes
    });

    // Construct the authorization URL
    const authUrl = new URL('https://monroneylabels.com/oauth/authorize');
    authUrl.searchParams.append('client_id', MONRONEY_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('scope', 'read write');

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error initializing Monroney OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initialize OAuth flow' },
      { status: 500 }
    );
  }
} 