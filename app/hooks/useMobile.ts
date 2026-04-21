import { useEffect, useState } from "react";
import { getViewportMode, subscribeViewportMode } from "../lib/viewport";

const MOBILE_BREAKPOINT = 768;

function computeIsMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const override = getViewportMode();
  if (override === "mobile") return true;
  if (override === "desktop") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => computeIsMobile());

  useEffect(() => {
    const recompute = () => setIsMobile(computeIsMobile());
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", recompute);
    const unsubscribe = subscribeViewportMode(recompute);
    return () => {
      mql.removeEventListener("change", recompute);
      unsubscribe();
    };
  }, []);

  return isMobile;
}
