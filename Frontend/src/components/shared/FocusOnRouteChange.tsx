"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function FocusOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.focus({ preventScroll: false });
    }
  }, [pathname]);

  return null;
}
