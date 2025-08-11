import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { organizationId } = await req.json();
    
    if (!organizationId) {
      return new NextResponse('Organization ID required', { status: 400 });
    }
    
    // Validate user has access to this organization
    const hasAccess = session.organizations?.some(
      org => org.id === organizationId
    );
    
    if (!hasAccess) {
      return new NextResponse('Access denied to this organization', { status: 403 });
    }

    // Get the organization details
    const organization = session.organizations.find(
      org => org.id === organizationId
    );

    // Return success with the organization data
    // Client will need to trigger a session update via next-auth/react
    return NextResponse.json({
      success: true,
      organization,
      currentOrgId: organizationId
    });
  } catch (error) {
    console.error('Error switching organization:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Return current organization and available organizations
    return NextResponse.json({
      currentOrganization: session.currentOrganization,
      organizations: session.organizations || []
    });
  } catch (error) {
    console.error('Error fetching organization info:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}