import type { MutableRefObject } from "react";

import { SurfaceCard } from "../../components/common";
import { extractDateParts, type DayGroup } from "./types";

interface DaysSidebarProps {
  groups: DayGroup[];
  currentDay: number;
  totalDays: number;
  dayRefs: MutableRefObject<Map<number, HTMLElement>>;
}

export function DaysSidebar({ groups, currentDay, totalDays, dayRefs }: DaysSidebarProps) {
  return (
    <SurfaceCard className="p-4">
      <div className="flex items-baseline justify-between mb-3 px-1">
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Дни кемпа
        </p>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {currentDay} / {totalDays}
        </p>
      </div>
      <div className="flex flex-col">
        {groups.map((group) => {
          const parts = group.date ? extractDateParts(group.date) : null;
          const isActive = group.day === currentDay;
          return (
            <button
              key={group.day}
              onClick={() => {
                const node = dayRefs.current.get(group.day);
                node?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="group flex items-center gap-3 px-2 py-2 rounded-[var(--radius-md)] text-left transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <div
                className="w-10 h-10 rounded-[var(--radius-md)] flex flex-col items-center justify-center shrink-0 leading-none"
                style={{
                  background: isActive ? "var(--brand)" : "var(--bg-subtle)",
                  color: isActive ? "var(--brand-contrast)" : "var(--text-primary)",
                }}
              >
                <span className="text-[15px]" style={{ fontWeight: 600 }}>
                  {parts?.dayNumber ?? group.day}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider mt-0.5"
                  style={{
                    color: isActive ? "var(--brand-contrast)" : "var(--text-tertiary)",
                    opacity: isActive ? 0.75 : 1,
                  }}
                >
                  {parts?.month ?? ""}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[14px] truncate"
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {parts?.weekday ?? `День ${group.day}`}
                </p>
                <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  День {group.day}
                </p>
              </div>
              <span
                className="text-[12px] px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background: isActive ? "var(--brand-soft)" : "var(--bg-subtle)",
                  color: isActive ? "var(--brand-contrast)" : "var(--text-tertiary)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {group.materials.length}
              </span>
            </button>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
