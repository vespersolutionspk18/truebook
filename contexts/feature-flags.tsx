'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FeatureFlagKey } from '@/lib/feature-flags';

interface FeatureFlagsContextType {
  flags: Record<string, boolean>;
  isLoading: boolean;
  checkFlag: (key: FeatureFlagKey) => boolean;
  refetch: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = async () => {
    try {
      const response = await fetch('/api/feature-flags');
      if (response.ok) {
        const data = await response.json();
        setFlags(data);
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const checkFlag = (key: FeatureFlagKey): boolean => {
    return flags[key] || false;
  };

  return (
    <FeatureFlagsContext.Provider
      value={{
        flags,
        isLoading,
        checkFlag,
        refetch: fetchFlags,
      }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { checkFlag } = useFeatureFlags();
  return checkFlag(key);
}