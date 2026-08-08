"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { DataProvider } from "@/providers/DataProvider";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { FocusOnRouteChange } from "@/components/shared/FocusOnRouteChange";
import { ShortcutHelp } from "@/components/shared/ShortcutHelp";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeyboardShortcuts();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <DataProvider>
      <SkipToContent />
      <FocusOnRouteChange />
      <ShortcutHelp />
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <div
          className={cn(
            "flex-1 min-w-0 flex flex-col transition-[padding] duration-300",
            sidebarCollapsed ? "md:pl-[68px]" : "md:pl-64",
          )}
        >
          <TopBar />
          <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 animate-fade-in outline-none overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </DataProvider>
  );
}
