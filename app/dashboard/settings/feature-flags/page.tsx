'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Beaker, Users, Percent, Globe } from 'lucide-react';
import Link from 'next/link';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { useOrganization } from '@/contexts/organization-context';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  defaultEnabled: boolean;
  enabledForAll: boolean;
  percentage?: number;
  organizationOverride?: {
    id: string;
    enabled: boolean;
    metadata?: any;
  };
}

export default function FeatureFlagsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadFeatureFlags();
    }
  }, [currentOrganization]);

  const loadFeatureFlags = async () => {
    if (!currentOrganization) return;
    
    try {
      // Load feature flags
      const flagsResponse = await fetch(`/api/organizations/${currentOrganization.id}/feature-flags`);
      if (flagsResponse.ok) {
        const flagsData = await flagsResponse.json();
        setFlags(flagsData);
      }
    } catch (error) {
      console.error('Error loading feature flags:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feature flags',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey: string, enabled: boolean) => {
    setUpdating(flagKey);
    try {
      const response = await fetch(`/api/organizations/${currentOrganization?.id}/feature-flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureFlagKey: flagKey,
          enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update feature flag');
      }

      // Reload flags
      await loadFeatureFlags();
      
      toast({
        title: 'Feature flag updated',
        description: `${flagKey} is now ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update feature flag',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getFlagStatus = (flag: FeatureFlag): { label: string; variant: 'default' | 'secondary' | 'outline' } => {
    if (flag.organizationOverride) {
      return flag.organizationOverride.enabled
        ? { label: 'Enabled', variant: 'default' }
        : { label: 'Disabled', variant: 'secondary' };
    }
    if (flag.enabledForAll) {
      return { label: 'Enabled for all', variant: 'default' };
    }
    if (flag.percentage) {
      return { label: `${flag.percentage}% rollout`, variant: 'outline' };
    }
    return flag.defaultEnabled
      ? { label: 'Default enabled', variant: 'outline' }
      : { label: 'Default disabled', variant: 'secondary' };
  };

  const groupedFlags = {
    core: flags.filter(f => ['api_v2', 'advanced_search', 'bulk_operations'].includes(f.key)),
    dashboard: flags.filter(f => f.key.includes('dashboard') || f.key.includes('real_time')),
    vehicle: flags.filter(f => f.key.includes('vehicle') || f.key.includes('ai')),
    team: flags.filter(f => f.key.includes('team')),
    integration: flags.filter(f => f.key.includes('export') || f.key.includes('webhook') || f.key.includes('sync')),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Feature Flags</h2>
        <p className="text-sm text-muted-foreground">Control access to experimental and premium features</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How Feature Flags Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-start gap-3">
              <Beaker className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Organization Override</p>
                <p className="text-xs text-muted-foreground">Your custom settings override defaults</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Global Enable</p>
                <p className="text-xs text-muted-foreground">Feature is on for all organizations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Percent className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Percentage Rollout</p>
                <p className="text-xs text-muted-foreground">Gradual rollout to organizations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Default Setting</p>
                <p className="text-xs text-muted-foreground">Fallback when no rules apply</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Features</TabsTrigger>
          <TabsTrigger value="core">Core</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integration">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {flags.map((flag) => (
            <FeatureFlagCard
              key={flag.id}
              flag={flag}
              onToggle={toggleFlag}
              updating={updating === flag.key}
            />
          ))}
        </TabsContent>

        {Object.entries(groupedFlags).map(([group, groupFlags]) => (
          <TabsContent key={group} value={group} className="space-y-4">
            {groupFlags.map((flag) => (
              <FeatureFlagCard
                key={flag.id}
                flag={flag}
                onToggle={toggleFlag}
                updating={updating === flag.key}
              />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function FeatureFlagCard({
  flag,
  onToggle,
  updating,
}: {
  flag: FeatureFlag;
  onToggle: (key: string, enabled: boolean) => void;
  updating: boolean;
}) {
  const status = getFlagStatus(flag);
  const isEnabled = flag.organizationOverride?.enabled ?? (flag.enabledForAll || flag.defaultEnabled);

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{flag.name}</h3>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{flag.key}</code>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {flag.description && (
            <p className="text-sm text-muted-foreground">{flag.description}</p>
          )}
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onToggle(flag.key, checked)}
          disabled={updating}
        />
      </CardContent>
    </Card>
  );
}

function getFlagStatus(flag: FeatureFlag): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (flag.organizationOverride) {
    return flag.organizationOverride.enabled
      ? { label: 'Enabled', variant: 'default' }
      : { label: 'Disabled', variant: 'secondary' };
  }
  if (flag.enabledForAll) {
    return { label: 'Enabled for all', variant: 'default' };
  }
  if (flag.percentage) {
    return { label: `${flag.percentage}% rollout`, variant: 'outline' };
  }
  return flag.defaultEnabled
    ? { label: 'Default enabled', variant: 'outline' }
    : { label: 'Default disabled', variant: 'secondary' };
}