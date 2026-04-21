import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "wide";
}

export function PageShell({ children, className = "", size = "default" }: PageShellProps) {
  const sizeClass = size === "wide" ? "md:max-w-5xl xl:max-w-6xl" : "md:max-w-3xl";
  return <div className={`w-full max-w-lg mx-auto ${sizeClass} ${className}`}>{children}</div>;
}
