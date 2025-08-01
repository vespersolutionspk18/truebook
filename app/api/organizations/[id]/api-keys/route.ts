import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default([]),
  expiresIn: z.number().optional(), // days
});

// Generate a secure API key
function generateApiKey(): string {
  return `tbai_${crypto.randomBytes(32).toString('base64url')}`;
}

// Hash API key for storage
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hashBuffer).toString('hex');
}

// GET /api/organizations/[id]/api-keys - List API keys
export const GET = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      const apiKeys = await db.apiKey.findMany({
        where: {
          organizationId: id,
        },
        select: {
          id: true,
          name: true,
          permissions: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
          // Never return the actual key
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(apiKeys);
    } catch (error) {
      logger.error('Failed to fetch API keys', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);

// POST /api/organizations/[id]/api-keys - Create API key
export const POST = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      const body = await req.json();
      const validatedData = createApiKeySchema.parse(body);

      // Check API key limits based on plan
      const keyCount = await db.apiKey.count({
        where: { organizationId: id },
      });

      const limits = {
        FREE: 2,
        PRO: 10,
        ENTERPRISE: -1, // unlimited
      };

      const limit = limits[context.organization.plan as keyof typeof limits];
      if (limit !== -1 && keyCount >= limit) {
        return NextResponse.json(
          { error: `API key limit reached for ${context.organization.plan} plan` },
          { status: 403 }
        );
      }

      // Generate API key
      const rawKey = generateApiKey();
      const hashedKey = await hashApiKey(rawKey);

      // Calculate expiration
      let expiresAt: Date | null = null;
      if (validatedData.expiresIn) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + validatedData.expiresIn);
      }

      // Create API key
      const apiKey = await db.apiKey.create({
        data: {
          key: hashedKey,
          name: validatedData.name,
          organizationId: id,
          permissions: validatedData.permissions,
          expiresAt,
        },
        select: {
          id: true,
          name: true,
          permissions: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          organizationId: id,
          userId: context.user.id,
          action: 'api_key.created',
          resource: apiKey.id,
          metadata: {
            name: validatedData.name,
            permissions: validatedData.permissions,
            expiresAt,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      logger.info('API key created', {
        organizationId: id,
        apiKeyId: apiKey.id,
        name: validatedData.name,
      });

      // Return the key only once
      return NextResponse.json({
        ...apiKey,
        key: rawKey,
        message: 'Save this key securely. You won\'t be able to see it again.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }

      logger.error('Failed to create API key', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);

// DELETE /api/organizations/[id]/api-keys/[keyId] - Revoke API key
export const DELETE = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const url = new URL(req.url);
      const keyId = url.pathname.split('/').pop();

      if (!keyId || keyId === 'api-keys') {
        return new NextResponse('Key ID required', { status: 400 });
      }

      // Verify organization access
      if (context.organization.id !== id) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      // Verify key belongs to organization
      const apiKey = await db.apiKey.findFirst({
        where: {
          id: keyId,
          organizationId: id,
        },
      });

      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key not found' },
          { status: 404 }
        );
      }

      // Delete the key
      await db.apiKey.delete({
        where: { id: keyId },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          organizationId: id,
          userId: context.user.id,
          action: 'api_key.revoked',
          resource: keyId,
          metadata: {
            name: apiKey.name,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      logger.info('API key revoked', {
        organizationId: id,
        apiKeyId: keyId,
        name: apiKey.name,
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      logger.error('Failed to revoke API key', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);