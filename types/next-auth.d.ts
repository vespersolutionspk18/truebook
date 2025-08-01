import { DefaultSession } from "next-auth";
import { OrgRole, PlanType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
    } & DefaultSession["user"];
    currentOrganization?: {
      id: string;
      name: string;
      slug: string;
      role: OrgRole;
      plan: PlanType;
    };
    organizations?: Array<{
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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    email: string;
    name?: string | null;
    currentOrganization?: {
      id: string;
      name: string;
      slug: string;
      role: OrgRole;
      plan: PlanType;
    };
    organizations?: Array<{
      id: string;
      name: string;
      slug: string;
      role: OrgRole;
      plan: PlanType;
    }>;
  }
}