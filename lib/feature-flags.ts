import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

// Feature flag keys - centralized list
export const FEATURE_FLAGS = {
  // Core features
  API_V2: 'api_v2',
  ADVANCED_SEARCH: 'advanced_search',
  BULK_OPERATIONS: 'bulk_operations',
  
  // Dashboard features
  NEW_DASHBOARD: 'new_dashboard',
  ANALYTICS_DASHBOARD: 'analytics_dashboard',
  REAL_TIME_UPDATES: 'real_time_updates',
  
  // Vehicle features
  AI_VEHICLE_VALIDATION: 'ai_vehicle_validation',
  VEHICLE_HISTORY: 'vehicle_history',
  VEHICLE_COMPARISON_V2: 'vehicle_comparison_v2',
  
  // Team features
  TEAM_COLLABORATION: 'team_collaboration',
  TEAM_ACTIVITY_FEED: 'team_activity_feed',
  
  // Export features
  ADVANCED_EXPORTS: 'advanced_exports',
  CUSTOM_REPORTS: 'custom_reports',
  
  // Integration features
  WEBHOOK_INTEGRATIONS: 'webhook_integrations',
  THIRD_PARTY_SYNC: 'third_party_sync',
} as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

interface FeatureFlagCheck {
  enabled: boolean;
  metadata?: any;
}

/**
 * Check if a feature flag is enabled for an organization
 */
export async function isFeatureEnabled(
  organizationId: string,
  flagKey: FeatureFlagKey
): Promise<boolean> {
  try {
    const check = await checkFeatureFlag(organizationId, flagKey);
    return check.enabled;
  } catch (error) {
    logger.error('Error checking feature flag', {
      organizationId,
      flagKey,
      error,
    });
    return false; // Default to disabled on error
  }
}

/**
 * Check feature flag with metadata
 */
export async function checkFeatureFlag(
  organizationId: string,
  flagKey: FeatureFlagKey
): Promise<FeatureFlagCheck> {
  // Check cache first
  const cacheKey = `feature:${organizationId}:${flagKey}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Check database
  const flag = await db.featureFlag.findUnique({
    where: { key: flagKey },
    include: {
      organizationFlags: {
        where: { organizationId },
      },
    },
  });

  if (!flag) {
    return { enabled: false };
  }

  // Check organization-specific override
  if (flag.organizationFlags.length > 0) {
    const orgFlag = flag.organizationFlags[0];
    const result = {
      enabled: orgFlag.enabled,
      metadata: orgFlag.metadata,
    };
    await redis.setex(cacheKey, 300, JSON.stringify(result)); // Cache for 5 minutes
    return result;
  }

  // Check global settings
  if (flag.enabledForAll) {
    const result = { enabled: true };
    await redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  // Check percentage rollout
  if (flag.percentage && flag.percentage > 0) {
    // Use organization ID for consistent hashing
    const hash = organizationId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    const enabled = Math.abs(hash) % 100 < flag.percentage;
    const result = { enabled };
    await redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  // Default to flag's default setting
  const result = { enabled: flag.defaultEnabled };
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  return result;
}

/**
 * Check multiple feature flags at once
 */
export async function checkFeatureFlags(
  organizationId: string,
  flagKeys: FeatureFlagKey[]
): Promise<Record<FeatureFlagKey, boolean>> {
  const results = await Promise.all(
    flagKeys.map(async (key) => {
      const enabled = await isFeatureEnabled(organizationId, key);
      return { key, enabled };
    })
  );

  return results.reduce((acc, { key, enabled }) => {
    acc[key] = enabled;
    return acc;
  }, {} as Record<FeatureFlagKey, boolean>);
}

/**
 * Clear feature flag cache for an organization
 */
export async function clearFeatureFlagCache(organizationId: string) {
  const pattern = `feature:${organizationId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * React hook for feature flags (to be used in client components)
 */
export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  // This would be implemented with a context provider
  // that fetches flags from the API
  return false; // Placeholder
}