import { Check, ChevronRight, MapPin, X, type LucideIcon } from "lucide-react";

import { SurfaceCard } from "../common";
import type { CurrentUser, Event } from "../../lib/domain";
import { isCountableEvent, splitEventTitle } from "../../lib/events";

interface DayEventsSnippetProps {
  events: Event[];
  currentUser: CurrentUser;
  onOpenEvent: (event: Event) => void;
  onOpenSchedule: () => void;
}

export function DayEventsSnippet({
  events,
  currentUser,
  onOpenEvent,
  onOpenSchedule,
}: DayEventsSnippetProps) {
  if (events.length === 0) return null;

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3">
        <p
          className="text-[11px] uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          Расписание дня
        </p>
        <button
          onClick={onOpenSchedule}
          className="text-[12.5px] flex items-center gap-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Все дни <ChevronRight size={13} />
        </button>
      </div>
      <div className="px-5 sm:px-6 pb-5">
        {events.map((event, index) => {
          const isActive = event.status === "in_progress";
          const isDone = event.status === "completed";
          const isLast = index === events.length - 1;
          const dotColor = isActive
            ? "var(--success)"
            : isDone
              ? "var(--line-strong)"
              : "var(--brand)";
          const { title: rowTitle, teacher: rowTeacher } = splitEventTitle(event.title);
          return (
            <button
              key={event.id}
              onClick={() => onOpenEvent(event)}
              className="w-full flex gap-3 text-left transition-colors rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
            >
              <div className="flex flex-col items-center w-[14px] shrink-0">
                <div
                  className={`w-3 h-3 rounded-full border-2 mt-2 shrink-0 ${isActive ? "animate-pulse" : ""}`}
                  style={{
                    borderColor: dotColor,
                    backgroundColor: isActive ? "var(--success)" : "transparent",
                  }}
                />
                {!isLast && (
                  <div
                    className="w-[2px] flex-1 min-h-[28px]"
                    style={{ background: "var(--line-subtle)" }}
                  />
                )}
              </div>
              <div
                className={`flex-1 min-w-0 py-2 pr-2 ${isLast ? "" : "border-b"}`}
                style={{ borderColor: "var(--line-subtle)" }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[12.5px]"
                    style={{
                      color: isDone ? "var(--text-tertiary)" : "var(--text-secondary)",
                    }}
                  >
                    {event.startAt}–{event.endAt}
                  </span>
                  {isActive && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--success-soft)",
                        color: "var(--success)",
                        fontWeight: 600,
                      }}
                    >
                      Сейчас
                    </span>
                  )}
                  {currentUser.role === "participant" &&
                    isCountableEvent(event) &&
                    (() => {
                      const st =
                        event.attendance === "confirmed"
                          ? {
                              bg: "var(--success-soft)",
                              color: "var(--success)",
                              Icon: Check,
                              tip: "Посещение отмечено",
                            }
                          : event.status === "completed"
                            ? {
                                bg: "var(--danger-soft)",
                                color: "var(--danger)",
                                Icon: X as LucideIcon,
                                tip: "Занятие пропущено",
                              }
                            : null;
                      if (!st) return null;
                      const Ico = st.Icon;
                      return (
                        <span
                          aria-label={st.tip}
                          title={st.tip}
                          className="inline-flex items-center justify-center rounded-full shrink-0"
                          style={{
                            width: 20,
                            height: 20,
                            background: st.bg,
                            color: st.color,
                          }}
                        >
                          <Ico size={11} strokeWidth={2.4} />
                        </span>
                      );
                    })()}
                </div>
                <p
                  className="text-[14.5px] mt-0.5 leading-snug"
                  style={{
                    color: isDone ? "var(--text-tertiary)" : "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {rowTitle}
                </p>
                <div
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] mt-0.5"
                  style={{
                    color: isDone ? "var(--text-tertiary)" : "var(--text-secondary)",
                  }}
                >
                  {rowTeacher && <span>{rowTeacher}</span>}
                  {event.building && (
                    <>
                      {rowTeacher && <span aria-hidden="true">·</span>}
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {event.building}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
