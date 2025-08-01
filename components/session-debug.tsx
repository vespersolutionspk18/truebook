'use client';

import { useSession } from 'next-auth/react';
import { useOrganization } from '@/contexts/organization-context';
import { useEffect } from 'react';

export function SessionDebug() {
  const { data: session, status } = useSession();
  const { currentOrganization, organizations, isLoading } = useOrganization();

  useEffect(() => {
    console.log('SessionDebug - Session status:', status);
    console.log('SessionDebug - Session data:', session);
    console.log('SessionDebug - Current organization:', currentOrganization);
    console.log('SessionDebug - Organizations:', organizations);
    console.log('SessionDebug - Org loading:', isLoading);
  }, [session, status, currentOrganization, organizations, isLoading]);

  return null;
}