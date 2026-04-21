interface DeadlineBannerProps {
  title: string;
  deadline: string;
  onClick?: () => void;
}

export function DeadlineBanner({ title, deadline, onClick }: DeadlineBannerProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[var(--warning-soft)] border border-[var(--warning)]/20 rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3 text-left"
    >
      <div className="w-2 h-2 rounded-full bg-[var(--warning)] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-[var(--text-primary)]">{title}</p>
      </div>
      <span className="text-[13px] text-[var(--warning)] shrink-0">{deadline}</span>
    </button>
  );
}
