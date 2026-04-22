import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function PageHeader({ title, onBack, right }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="px-5 pt-5 pb-3 flex items-center gap-3">
      {onBack !== undefined && (
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="text-[var(--text-secondary)] -ml-1 p-1"
        >
          <ArrowLeft size={22} />
        </button>
      )}
      <h1 className="flex-1 text-[var(--text-primary)]">{title}</h1>
      {right}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  right?: ReactNode;
}

export function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-[13px] text-[var(--text-tertiary)] tracking-wide uppercase">{title}</p>
      {right}
    </div>
  );
}
