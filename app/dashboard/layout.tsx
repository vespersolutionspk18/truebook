"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import Script from 'next/script';
import { Button } from "@/components/ui/button";
import { ChevronFirst, ChevronLast } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BreadcrumbProvider, useBreadcrumb } from "@/contexts/breadcrumb-context";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const pathname = usePathname();
  const { customLabel } = useBreadcrumb();
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    paths.forEach((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      let label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      
      // Use custom label for the last breadcrumb if provided
      if (index === paths.length - 1 && customLabel) {
        label = customLabel;
      }
      
      // Only add if not redundant (skip first 'dashboard' since we start with Dashboard)
      if (index === 0 && path === 'dashboard') {
        breadcrumbs.push({ label: 'Dashboard', href: '/dashboard' });
      } else if (index > 0) {
        // Special case: vehicle pages are under inventory
        if (path === 'vehicle' && paths[index - 1] === 'dashboard') {
          breadcrumbs.push({ label: 'Inventory', href: '/dashboard/inventory' });
        }
        breadcrumbs.push({ label, href: index < paths.length - 1 ? href : undefined });
      }
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="flex">
      <Script 
        src="//labels-prod.s3.amazonaws.com/icon.js" 
        defer
      />
      <Sidebar 
        className="hidden lg:block h-screen" 
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />
      <main className="flex-1 p-3 overflow-hidden">
        <div className="flex flex-col h-[calc(100vh-1.5rem)] drop-shadow-md bg-white rounded-3xl p-10">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 mr-2"
            >
              {sidebarExpanded ? <ChevronFirst className="h-5 w-5" /> : <ChevronLast className="h-5 w-5" />}
            </Button>
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-gray-400">/</span>}
                {item.href ? (
                  <Link href={item.href} className="hover:text-gray-900">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-900">{item.label}</span>
                )}
              </div>
            ))}
          </nav>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BreadcrumbProvider>
      <DashboardContent>{children}</DashboardContent>
    </BreadcrumbProvider>
  );
}