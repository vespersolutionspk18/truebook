'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { OrgRole, PlanType } from '@prisma/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
  plan: PlanType;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization: (orgId: string) => Promise<void>;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }
    
    if (session) {
      setCurrentOrganization(session.currentOrganization || null);
      setOrganizations(session.organizations || []);
      setIsLoading(false);
    } else {
      setCurrentOrganization(null);
      setOrganizations([]);
      setIsLoading(false);
    }
  }, [session, status]);

  const switchOrganization = async (orgId: string) => {
    if (!session) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/switch-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch organization');
      }

      const { organization, currentOrgId } = await response.json();
      
      // Update the session with the new organization
      await update({
        currentOrgId: currentOrgId
      });
      
      // Update local state immediately for UI responsiveness
      setCurrentOrganization(organization);

      // Set organization header for subsequent requests
      if (typeof window !== 'undefined') {
        localStorage.setItem('x-organization-id', orgId);
      }

      // Refresh the current page to reload data with new org context
      router.refresh();
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add organization header to all fetch requests
  useEffect(() => {
    if (currentOrganization && typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [resource, config] = args;
        
        // Only add header for API routes
        if (typeof resource === 'string' && resource.startsWith('/api/')) {
          const headers = new Headers(config?.headers);
          headers.set('x-organization-id', currentOrganization.id);
          
          const newConfig = {
            ...config,
            headers,
          };
          return originalFetch.call(window, resource, newConfig);
        }
        
        return originalFetch.apply(window, args);
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [currentOrganization]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        switchOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}