"use client";

import { Navbar } from "@/components/ui/navbar";
import { Sidebar, useSidebarCollapsed } from "@/components/ui/sidebar";

export default function DashboardLayout({
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
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
