"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { OrganizationProvider } from "@/contexts/organization-context";

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <SessionProvider>
      <OrganizationProvider>
        {children}
        <Toaster />
      </OrganizationProvider>
    </SessionProvider>
  );
}