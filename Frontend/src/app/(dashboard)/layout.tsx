"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { DataProvider } from "@/providers/DataProvider";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { FocusOnRouteChange } from "@/components/shared/FocusOnRouteChange";
import { ShortcutHelp } from "@/components/shared/ShortcutHelp";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeyboardShortcuts();

  return (
    <DataProvider>
      <SkipToContent />
      <FocusOnRouteChange />
      <ShortcutHelp />
      <div className="min-h-screen">
        <Sidebar />
        <div className="pl-64">
          <TopBar />
          <main id="main-content" tabIndex={-1} className="p-6 animate-fade-in outline-none">
            {children}
          </main>
        </div>
      </div>
    </DataProvider>
  );
}
