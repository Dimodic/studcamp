import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const BASE_CLASS =
  "inline-flex items-center justify-center gap-2 h-[var(--button-height)] px-8 rounded-[var(--radius-lg)] text-[18px] font-medium disabled:opacity-40 disabled:cursor-not-allowed select-none transition-[background-color,color,border-color,transform] duration-150";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${BASE_CLASS} bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)] ${className}`}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${BASE_CLASS} bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--text-primary)] hover:bg-[var(--bg-subtle)] ${className}`}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {children}
    </button>
  );
}
