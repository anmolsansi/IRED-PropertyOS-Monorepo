"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Bell, HelpCircle, ChevronDown, LogOut, User, Settings, Command, FileText, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthSession } from "@/hooks/use-session";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/Sidebar";
import { useDataMode } from "@/providers/DataProvider";
import { V1_NAV_ITEMS, V2_NAV_ITEMS } from "@/lib/constants";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

const NAV_PAGES = [
  { label: "Dashboard", route: "/dashboard" },
  { label: "Properties", route: "/properties" },
  { label: "Clients", route: "/clients" },
  { label: "Approvals", route: "/approvals" },
  { label: "Tasks", route: "/tasks" },
  { label: "Deals", route: "/deals" },
  { label: "Reports", route: "/reports" },
  { label: "Settings", route: "/settings" },
];

export function TopBar({ isV2 = false }: { isV2?: boolean }) {
  const { session, signOut } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const { mode, toggleMode, isMaster } = useDataMode();
  const navItems = isV2 ? V2_NAV_ITEMS : V1_NAV_ITEMS;

  const user = session?.user;
  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile menu on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  // ⌘K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredPages = searchQuery.length > 0
    ? NAV_PAGES.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  function handlePageNav(route: string) {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(route);
  }

  return (
    <>
      <header role="banner" className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center gap-4 px-4 sm:px-6">
          {/* Mobile Menu Trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
              <VisuallyHidden.Root>
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Main navigation for the application</SheetDescription>
              </VisuallyHidden.Root>
              <SidebarContent
                collapsed={false}
                navItems={navItems}
                pathname={pathname}
                mode={mode}
                isMaster={isMaster}
                toggleMode={toggleMode}
              />
            </SheetContent>
          </Sheet>

          {/* Welcome */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">
              Welcome back, {user?.fullName?.split(" ")[0] || "User"}{" "}
              <span className="inline-block">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">
              Here&apos;s what&apos;s happening across your portfolio today.
            </p>
          </div>

          {/* Mobile Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Desktop Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search (Ctrl+K)"
            className="relative w-64 lg:w-96 hidden md:flex items-center h-10 pl-10 pr-12 rounded-lg border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors shrink-0"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
            <span className="truncate">Search properties, clients, deals...</span>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors hidden sm:block" aria-label="Notifications" disabled>
              <Bell className="h-5 w-5 text-muted-foreground" />
            </button>

            <ThemeToggle />

            <button className="p-2 rounded-lg hover:bg-muted transition-colors hidden sm:block">
              <HelpCircle className="h-5 w-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer ml-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.fullName || "User"} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium truncate max-w-[120px]">{user?.fullName || "User"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role?.toLowerCase() || "worker"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden lg:block shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Search Dialog */}
      {searchOpen && (
        <div role="dialog" aria-label="Search" className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-lg bg-background rounded-xl shadow-2xl border overflow-hidden">
            <div className="flex items-center border-b px-4" role="search">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search properties, clients, deals, pages..."
                className="flex-1 h-12 px-3 text-sm bg-transparent focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search"
              />
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Command className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  Type to navigate across your portfolio
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No pages found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPages.map((page) => (
                    <button
                      key={page.route}
                      onClick={() => handlePageNav(page.route)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left"
                    >
                      <FileText className="h-4 w-4" />
                      <div>
                        <p>{page.label}</p>
                        <p className="text-xs text-muted-foreground">{page.route}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
