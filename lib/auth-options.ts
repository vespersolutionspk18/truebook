import { NextAuthOptions } from "next-auth";
import { db } from "@/lib/db";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole, OrgRole, PlanType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
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
    name?: string | null;
    email?: string | null;
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
    id: string;
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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Missing credentials');
      }

      const user = await db.user.findUnique({
        where: {
          email: credentials.email
        },
        include: {
          organizations: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  plan: true
                }
              }
            },
            orderBy: {
              joinedAt: 'desc'
            }
          }
        }
      });

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await compare(
        credentials.password,
        user.password
      );

      if (!isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        organizations: user.organizations
      };
    }
  })],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role;
        
        // Transform organizations data
        token.organizations = user.organizations?.map(ou => ({
          id: ou.organization.id,
          name: ou.organization.name,
          slug: ou.organization.slug,
          role: ou.role,
          plan: ou.organization.plan
        })) || [];
        
        // Set default organization (most recent)
        if (token.organizations.length > 0) {
          token.currentOrgId = token.organizations[0].id;
        }
      }

      // Handle organization switching
      if (trigger === "update" && session?.currentOrgId) {
        token.currentOrgId = session.currentOrgId;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.image;
        session.user.role = token.role;
        
        // Add organizations to session
        session.organizations = token.organizations || [];
        
        // Set current organization
        if (token.organizations && token.organizations.length > 0) {
          if (token.currentOrgId) {
            // Use the specified current organization
            const currentOrg = token.organizations.find(
              org => org.id === token.currentOrgId
            );
            if (currentOrg) {
              session.currentOrganization = currentOrg;
            }
          } else {
            // If no current org is set, use the first organization
            session.currentOrganization = token.organizations[0];
          }
        }
      }
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      } else if (url.startsWith(baseUrl)) {
        return url;
      }
      return `${baseUrl}/dashboard`;
    }
  },
};