import { DefaultSession } from "next-auth";
import { UserRole, OrgRole, PlanType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
    currentOrganization?: {
      id: string;
      name: string;
      slug: string;
      role: OrgRole;
      plan: PlanType;
    };
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      role: OrgRole;
      plan: PlanType;
    }>;
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: UserRole;
    organizations?: Array<{
      organization: {
        id: string;
        name: string;
        slug: string;
        plan: PlanType;
      };
      role: OrgRole;
    }>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role: UserRole;
    currentOrgId?: string;
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      role: OrgRole;
      plan: PlanType;
    }>;
  }
}