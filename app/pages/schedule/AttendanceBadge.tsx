import { Check, Clock, X as XIcon, type LucideIcon } from "lucide-react";

/** Маленький самостоятельный бейдж с иконкой посещаемости. Рендерится как
 * 22-пиксельный кружок у правого края карточки — не зависит от layout
 * преподавателя и сразу читается как «статус посещения». */
export function AttendanceBadge({
  attendance,
  eventStatus,
  isParticipant,
  counts,
}: {
  attendance?: "confirmed" | "pending" | "not_checked" | null;
  eventStatus: string;
  isParticipant: boolean;
  counts: boolean;
}) {
  if (!isParticipant || !counts) return null;
  let bg = "";
  let color = "";
  let Icon: LucideIcon | null = null;
  let tooltip = "";
  if (attendance === "confirmed") {
    bg = "var(--success-soft)";
    color = "var(--success)";
    Icon = Check;
    tooltip = "Посещение отмечено";
  } else if (attendance === "pending") {
    bg = "var(--warning-soft)";
    color = "var(--warning)";
    Icon = Clock;
    tooltip = "Посещение проверяется";
  } else if (eventStatus === "completed") {
    bg = "var(--danger-soft)";
    color = "var(--danger)";
    Icon = XIcon;
    tooltip = "Занятие пропущено";
  }
  if (!Icon) return null;
  return (
    <span
      aria-label={tooltip}
      title={tooltip}
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: 22, height: 22, background: bg, color }}
    >
      <Icon size={12} strokeWidth={2.4} />
    </span>
  );
}
