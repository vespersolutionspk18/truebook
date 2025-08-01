import { db } from "@/lib/db";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, organizationName } = body;

    if (!email || !password) {
      return new NextResponse("Missing email or password", { status: 400 });
    }

    const exists = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (exists) {
      return new NextResponse("User already exists", { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    // Create user and their default organization in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      // Create a default organization for the user
      const orgSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
      let finalSlug = orgSlug;
      let counter = 1;
      
      // Ensure unique slug
      while (await tx.organization.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${orgSlug}-${counter}`;
        counter++;
      }

      const organization = await tx.organization.create({
        data: {
          name: organizationName || `${name || email.split('@')[0]}'s Organization`,
          slug: finalSlug,
          plan: 'FREE',
        },
      });

      // Add user as owner of the organization
      await tx.organizationUser.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      // Create user settings
      await tx.settings.create({
        data: {
          userId: user.id,
          notifications: true,
          emailUpdates: true,
          darkMode: false,
        },
      });

      return { user, organization };
    });

    return NextResponse.json({
      user: {
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}