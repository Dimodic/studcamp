import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

export function SurfaceCard({ children, className = "", onClick, style }: SurfaceCardProps) {
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKey : undefined}
      className={`bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--line-subtle)] text-left w-full ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{ boxShadow: "var(--shadow-card)", ...style }}
    >
      {children}
    </div>
  );
}
