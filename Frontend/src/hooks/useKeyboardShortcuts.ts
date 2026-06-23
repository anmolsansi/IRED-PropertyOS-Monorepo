"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS: { key: string; ctrl?: boolean; shift?: boolean; label: string; path: string }[] = [
  { key: "1", ctrl: true, label: "Dashboard", path: "/dashboard" },
  { key: "2", ctrl: true, label: "Properties", path: "/properties" },
  { key: "3", ctrl: true, label: "Clients", path: "/clients" },
  { key: "4", ctrl: true, label: "Deals", path: "/deals" },
  { key: "5", ctrl: true, label: "Tasks", path: "/tasks" },
  { key: "p", ctrl: true, shift: true, label: "New Property", path: "/properties/new" },
  { key: "c", ctrl: true, shift: true, label: "New Client", path: "/clients/new" },
  { key: "m", ctrl: true, shift: true, label: "Map View", path: "/map" },
  { key: "r", ctrl: true, shift: true, label: "Reports", path: "/reports" },
];

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      for (const shortcut of SHORTCUTS) {
        if (
          shortcut.ctrl === isCtrl &&
          shortcut.shift === isShift &&
          e.key.toLowerCase() === shortcut.key.toLowerCase()
        ) {
          e.preventDefault();
          router.push(shortcut.path);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}

export { SHORTCUTS };
