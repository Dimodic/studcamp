import { useEffect } from "react";

/** Блокирует прокрутку <body> пока условие истинно (модалки, overlay-листы). */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
