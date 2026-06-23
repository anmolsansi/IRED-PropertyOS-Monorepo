"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Navigate faster with these shortcuts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={`${shortcut.key}-${shortcut.ctrl}-${shortcut.shift}`}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted"
            >
              <span className="text-sm">{shortcut.label}</span>
              <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                {shortcut.ctrl ? (navigator.platform.includes("Mac") ? "⌘" : "Ctrl") : ""}
                {shortcut.shift ? "+Shift" : ""}
                {shortcut.ctrl ? "+" : ""}
                {shortcut.key.toUpperCase()}
              </kbd>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted">
            <span className="text-sm">Search</span>
            <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+K
            </kbd>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted">
            <span className="text-sm">This help</span>
            <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Shift+?
            </kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
