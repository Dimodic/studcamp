import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

function computeIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => computeIsMobile());

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const recompute = () => setIsMobile(computeIsMobile());
    mql.addEventListener("change", recompute);
    return () => mql.removeEventListener("change", recompute);
  }, []);

  return isMobile;
}
