"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { V1_NAV_ITEMS, V2_NAV_ITEMS, type NavItem } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Headphones,
} from "lucide-react";
import { useState } from "react";
import { useDataMode } from "@/providers/DataProvider";

interface SidebarProps {
  isV2?: boolean;
}

export function Sidebar({ isV2 = false }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { mode, toggleMode, isMaster } = useDataMode();
  const navItems = isV2 ? V2_NAV_ITEMS : V1_NAV_ITEMS;
  const activeHref = navItems.reduce<string | undefined>((match, item) => {
    const isSettingsRoot = item.href === "/settings";
    const isActive = isSettingsRoot
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

    if (!isActive) return match;
    if (!match || item.href.length > match.length) return item.href;
    return match;
  }, undefined);

  return (
    <aside
      aria-label={isV2 ? "CRM Navigation" : "Property Management Navigation"}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border shrink-0">
        <Building2 className="h-8 w-8 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">IRED</span>
            <span className="text-[10px] text-sidebar-foreground/60 leading-none">
              PropertyOS
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={activeHref === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Master/Staging Toggle */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "rounded-lg bg-sidebar-accent p-3",
            collapsed && "px-2"
          )}
        >
          {!collapsed && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isMaster ? "bg-green-400 dark:bg-green-500" : "bg-yellow-400 dark:bg-yellow-500"
                  )}
                />
                <span className="text-xs font-medium">Master / Staging</span>
              </div>
              <p className="text-[11px] text-sidebar-foreground/60 mb-2">
                You are viewing{" "}
                <span
                  className={cn(
                    "font-semibold",
                    isMaster ? "text-green-400 dark:text-green-500" : "text-yellow-400 dark:text-yellow-500"
                  )}
                >
                  {mode.toUpperCase()}
                </span>
              </p>
              <button
                onClick={toggleMode}
                className="w-full text-left text-xs text-sidebar-primary hover:underline"
              >
                Switch to {isMaster ? "Staging" : "Master"}
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={toggleMode}
              className="w-full flex items-center justify-center"
              title={`Switch to ${isMaster ? "Staging" : "Master"}`}
            >
              <div
                className={cn(
                  "h-3 w-3 rounded-full",
                  isMaster ? "bg-green-400 dark:bg-green-500" : "bg-yellow-400 dark:bg-yellow-500"
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* Help & Collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <div className="flex items-center gap-2 mb-1">
              <Headphones className="h-4 w-4" />
              <span className="text-xs font-medium">Need Help?</span>
            </div>
            <p className="text-[11px] text-sidebar-foreground/60">
              Reach out to support
            </p>
            <a
              href="mailto:support@ired.co.in"
              className="text-[11px] text-sidebar-primary hover:underline"
            >
              support@ired.co.in
            </a>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-8 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}
