import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_STYLES,
  ROLE_LABELS,
  ROLE_STYLES,
} from "../../lib/options";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = EVENT_STATUS_STYLES[status] ?? EVENT_STATUS_STYLES.upcoming;
  return (
    <span
      className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)] inline-flex items-center gap-1.5"
      style={{ background: style.bg, color: style.color }}
    >
      {status === "in_progress" && (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: style.color }} />
      )}
      {EVENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.participant;
  return (
    <span
      className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]"
      style={{ background: style.bg, color: style.color }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
