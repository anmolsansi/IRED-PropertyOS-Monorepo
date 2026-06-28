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
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col md:pl-64">
          <TopBar />
          <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 animate-fade-in outline-none overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </DataProvider>
  );
}
