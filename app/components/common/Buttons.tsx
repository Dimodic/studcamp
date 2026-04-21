import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PrimaryButton({ children, onClick, disabled, className = "" }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full bg-[var(--brand)] text-[var(--brand-contrast)] py-3 rounded-[var(--radius-md)] text-[15px] font-medium flex items-center justify-center gap-2 transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, className = "" }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-[var(--bg-subtle)] text-[var(--text-primary)] py-3 rounded-[var(--radius-md)] text-[15px] flex items-center justify-center gap-2 transition-colors hover:bg-[var(--line-subtle)] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
