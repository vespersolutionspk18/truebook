"use client";

import { Sidebar } from "@/components/sidebar";
import Script from 'next/script';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Script 
        src="//labels-prod.s3.amazonaws.com/icon.js" 
        defer
      />
      <Sidebar className="hidden lg:block h-screen" />
      <main className="flex-1 p-3 overflow-hidden">
        <div className="flex flex-col h-[calc(100vh-1.5rem)] drop-shadow-md bg-white rounded-3xl p-10">
          {children}
        </div>
      </main>
    </div>
  );
}