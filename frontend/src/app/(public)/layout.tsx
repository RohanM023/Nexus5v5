"use client";

import { Navbar } from "@/components/ui/navbar";
import { Sidebar, useSidebarCollapsed } from "@/components/ui/sidebar";
import { LegalFooter } from "@/components/ui/legal-footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
      <LegalFooter />
    </div>
  );
}
