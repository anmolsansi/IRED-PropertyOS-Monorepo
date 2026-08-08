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

export default function V2Layout({
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
      <div className="min-h-screen">
        <Sidebar
          isV2
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <div
          className={cn(
            "transition-[padding] duration-300",
            sidebarCollapsed ? "pl-[68px]" : "pl-64",
          )}
        >
          <TopBar />
          <main id="main-content" tabIndex={-1} className="p-6 animate-fade-in outline-none">
            {children}
          </main>
        </div>
      </div>
    </DataProvider>
  );
}
