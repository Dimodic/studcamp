import { CalendarDays, Clock, CreditCard, MapPin, Navigation } from "lucide-react";

import { SurfaceCard } from "../../components/common";
import type { Event } from "../../lib/domain";
import { splitEventTitle } from "../../lib/events";
import { formatShortDate } from "./helpers";

interface NextEventCardProps {
  event: Event;
  onOpenRoute: (address: string, fallbackPlace: string) => void;
  onOpenBadge: () => void;
}

export function NextEventCard({ event, onOpenRoute, onOpenBadge }: NextEventCardProps) {
  const { title: nextTitle, teacher: nextTeacher } = splitEventTitle(event.title);
  const locationParts = [event.place, event.building, event.address]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  const uniqueParts = [...new Set(locationParts)];

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        {event.status === "in_progress" ? (
          <span
            className="text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5"
            style={{
              background: "var(--success-soft)",
              color: "var(--success)",
              fontWeight: 600,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--success)" }}
            />
            Идёт сейчас
          </span>
        ) : (
          <span
            className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Следующее
          </span>
        )}
      </div>

      <h2
        className="text-[22px] leading-tight mb-2"
        style={{ color: "var(--text-primary)", fontWeight: 600 }}
      >
        {nextTitle}
      </h2>
      {nextTeacher && (
        <p className="text-[13.5px] mb-3" style={{ color: "var(--text-secondary)" }}>
          {nextTeacher}
        </p>
      )}

      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        <span className="flex items-center gap-1.5">
          <Clock size={14} /> {event.startAt}–{event.endAt}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays size={14} /> {formatShortDate(event.date) ?? event.date}
        </span>
      </div>

      {uniqueParts.length > 0 && (
        <div
          className="rounded-[var(--radius-md)] p-3.5 mb-4 flex items-start gap-2.5 text-[13.5px] leading-relaxed"
          style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
        >
          <MapPin size={15} className="shrink-0 mt-0.5" style={{ color: "var(--text-tertiary)" }} />
          <div className="min-w-0">
            <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>{uniqueParts[0]}</p>
            {uniqueParts.slice(1).map((part, index) => (
              <p key={index} className="mt-0.5">
                {part}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onOpenRoute(event.address, event.place)}
          className="flex-1 min-w-[140px] py-2.5 rounded-[var(--radius-md)] text-[14px] flex items-center justify-center gap-2 transition-colors hover:bg-[var(--brand-hover)]"
          style={{
            background: "var(--brand)",
            color: "var(--brand-contrast)",
            fontWeight: 600,
          }}
        >
          <Navigation size={15} /> Маршрут
        </button>
        <button
          onClick={onOpenBadge}
          className="px-5 py-2.5 rounded-[var(--radius-md)] text-[14px] flex items-center gap-2 border transition-colors hover:bg-[var(--bg-subtle)]"
          style={{
            borderColor: "var(--line-subtle)",
            color: "var(--text-primary)",
            background: "var(--bg-card)",
            fontWeight: 500,
          }}
        >
          <CreditCard size={15} /> Бейдж
        </button>
      </div>
    </SurfaceCard>
  );
}
