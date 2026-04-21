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

  const interactiveClasses = onClick
    ? "cursor-pointer hover:border-[var(--line-strong)] hover:-translate-y-[1px] active:translate-y-0"
    : "";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKey : undefined}
      className={`bg-[var(--bg-card)] rounded-[var(--radius-md)] border border-[var(--line-subtle)] text-left w-full transition-[transform,border-color,background-color] duration-150 ${interactiveClasses} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
