import { ChevronRight, FileText } from "lucide-react";

import type { DocItem } from "../../lib/domain";

interface DeadlineCardProps {
  deadline: DocItem;
  onOpen: () => void;
}

export function DeadlineCard({ deadline, onOpen }: DeadlineCardProps) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-[var(--radius-lg)] border p-4 flex items-center gap-3 transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
    >
      <div
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{
          background: "color-mix(in srgb, var(--danger) 14%, transparent)",
          color: "var(--danger)",
        }}
      >
        <FileText size={19} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {deadline.title}
        </p>
        <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {deadline.status === "blocked"
            ? "Требует внимания"
            : deadline.status === "in_progress"
              ? "В процессе"
              : "Не начато"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13.5px]" style={{ color: "var(--danger)", fontWeight: 600 }}>
          {deadline.deadline}
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          дедлайн
        </p>
      </div>
      <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
    </button>
  );
}
