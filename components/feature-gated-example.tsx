'use client';

import { useFeatureFlag } from '@/contexts/feature-flags';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

/**
 * Example component showing how to use feature flags
 */
export function FeatureGatedExample() {
  const isAdvancedSearchEnabled = useFeatureFlag(FEATURE_FLAGS.ADVANCED_SEARCH);
  const isBulkOpsEnabled = useFeatureFlag(FEATURE_FLAGS.BULK_OPERATIONS);
  const isAnalyticsEnabled = useFeatureFlag(FEATURE_FLAGS.ANALYTICS_DASHBOARD);

  return (
    <div className="space-y-4">
      {/* Simple feature gating */}
      {isAdvancedSearchEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Advanced Search
              <Badge>New</Badge>
            </CardTitle>
            <CardDescription>
              Search with filters, sorting, and save your searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Advanced search UI would go here */}
            <p className="text-sm text-muted-foreground">Advanced search features...</p>
          </CardContent>
        </Card>
      )}

      {/* Multiple feature flags */}
      {(isBulkOpsEnabled || isAnalyticsEnabled) && (
        <Card>
          <CardHeader>
            <CardTitle>Premium Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isBulkOpsEnabled && (
              <div className="flex items-center justify-between p-2 border rounded">
                <span>Bulk Operations</span>
                <Badge variant="outline">Beta</Badge>
              </div>
            )}
            {isAnalyticsEnabled && (
              <div className="flex items-center justify-between p-2 border rounded">
                <span>Analytics Dashboard</span>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Server-side feature flag check example
 * This would be used in server components
 */
import { isFeatureEnabled } from '@/lib/feature-flags';

export async function ServerSideFeatureExample({ organizationId }: { organizationId: string }) {
  const isEnabled = await isFeatureEnabled(organizationId, FEATURE_FLAGS.NEW_DASHBOARD);

  if (!isEnabled) {
    return <div>Standard dashboard</div>;
  }

  return (
    <div>
      <h2>New Dashboard Experience</h2>
      {/* New dashboard components */}
    </div>
  );
}