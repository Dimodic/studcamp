interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors flex items-center gap-2"
      style={{
        background: active ? "var(--brand-soft)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--brand)" : "var(--line-subtle)"}`,
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
      <span
        className="text-[11px] px-1.5 py-0 rounded-full min-w-[20px] text-center"
        style={{
          background: active ? "var(--brand)" : "var(--bg-subtle)",
          color: active ? "var(--brand-contrast)" : "var(--text-tertiary)",
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );
}
