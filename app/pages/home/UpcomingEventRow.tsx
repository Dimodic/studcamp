import { ChevronRight } from "lucide-react";

import type { Event } from "../../lib/domain";
import { splitEventTitle } from "../../lib/events";

interface UpcomingEventRowProps {
  event: Event;
  onOpen: (event: Event) => void;
}

export function UpcomingEventRow({ event, onOpen }: UpcomingEventRowProps) {
  return (
    <button
      onClick={() => onOpen(event)}
      className="w-full text-left rounded-[var(--radius-md)] border px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
    >
      <span
        className="text-[10.5px] uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-full"
        style={{
          background: "var(--bg-subtle)",
          color: "var(--text-secondary)",
          fontWeight: 600,
        }}
      >
        Дальше
      </span>
      <span
        className="text-[13px] shrink-0 tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {event.startAt}
      </span>
      <span
        className="flex-1 min-w-0 truncate text-[14px]"
        style={{ color: "var(--text-primary)", fontWeight: 500 }}
      >
        {splitEventTitle(event.title).title}
      </span>
      <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
    </button>
  );
}
