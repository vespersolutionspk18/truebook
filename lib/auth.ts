import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrgRole, PlanType } from "@prisma/client";

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: UserRole;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: OrgRole;
    plan: PlanType;
  };
}

export async function getAuthContext(req?: NextRequest): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !session.user.id) {
    return null;
  }

  // Check for organization switch request
  let currentOrg = session.currentOrganization;
  
  if (req) {
    const requestedOrgId = req.headers.get('x-organization-id');
    if (requestedOrgId && session.organizations) {
      // Validate user has access to requested org
      const requestedOrg = session.organizations.find(
        org => org.id === requestedOrgId
      );
      if (requestedOrg) {
        currentOrg = requestedOrg;
      }
    }
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      role: session.user.role
    },
    organization: currentOrg
  };
}

export function requireAuth(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authContext = await getAuthContext(req);
    
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return handler(req, authContext);
  };
}

export function requireOrganization<T extends Record<string, any>>(
  handler: (req: NextRequest, context: Required<AuthContext>, params?: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, params?: T) => {
    const authContext = await getAuthContext(req);
    
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!authContext.organization) {
      return NextResponse.json({ error: 'Organization required' }, { status: 403 });
    }
    
    return handler(req, authContext as Required<AuthContext>, params);
  };
}

export function requireOrgRole(
  allowedRoles: string[],
  handler: (req: NextRequest, context: Required<AuthContext>) => Promise<NextResponse>
) {
  return requireOrganization(async (req, context) => {
    if (!allowedRoles.includes(context.organization.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    return handler(req, context);
  });
}

export function requireUser(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authContext = await getAuthContext(req);
    
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return handler(req, authContext);
  };
}