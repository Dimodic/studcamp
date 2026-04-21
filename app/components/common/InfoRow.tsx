import type { ReactNode } from "react";

interface InfoRowProps {
  label: string;
  value: ReactNode;
  action?: ReactNode;
}

export function InfoRow({ label, value, action }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[14px] text-[var(--text-tertiary)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[14px] text-[var(--text-primary)]">{value}</span>
        {action}
      </div>
    </div>
  );
}
