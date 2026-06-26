"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, HelpCircle, ChevronDown, LogOut, User, Settings, Command, FileText } from "lucide-react";
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

export function TopBar() {
  const { session, signOut } = useAuthSession();
  const router = useRouter();
  const user = session?.user;
  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        <div className="flex h-full min-w-0 items-center gap-4 px-6">
          {/* Welcome */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-6">
              Welcome back, {user?.fullName?.split(" ")[0] || "User"}{" "}
              <span className="inline-block">👋</span>
            </h1>
            <p className="truncate text-sm leading-5 text-muted-foreground">
              Here&apos;s what&apos;s happening across your portfolio today.
            </p>
          </div>

          {/* Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search (Ctrl+K)"
            className="relative hidden h-10 w-72 shrink-0 items-center rounded-lg border bg-muted/50 pl-10 pr-12 text-sm text-muted-foreground transition-colors hover:bg-muted lg:flex xl:w-96"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
            <span className="truncate">Search properties, clients, deals...</span>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Notifications - hidden until backend support exists */}
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Notifications" disabled>
              <Bell className="h-5 w-5 text-muted-foreground" />
            </button>

            <ThemeToggle />

            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <HelpCircle className="h-5 w-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.fullName || "User"} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden max-w-36 text-left sm:block">
                    <p className="truncate text-sm font-medium">{user?.fullName || "User"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role?.toLowerCase() || "worker"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
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
