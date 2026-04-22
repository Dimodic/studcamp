import type { Event } from "../../lib/domain";

export interface EventGroup {
  day: number;
  date: string;
  theme: string | null;
  events: Event[];
}

export interface DateParts {
  dayNumber: string;
  weekday: string;
  month: string;
}

export function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function formatDayHeader(value?: string | null): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return "Дата уточняется";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(parsed)
    .toUpperCase();
}

export function extractDateParts(value?: string | null): DateParts {
  const parsed = parseDate(value);
  if (!parsed) {
    return { dayNumber: "—", weekday: "", month: "" };
  }
  const dayNumber = new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(parsed);
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(parsed);
  const month = new Intl.DateTimeFormat("ru-RU", { month: "short" })
    .format(parsed)
    .replace(/\.$/, "");
  return {
    dayNumber,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    month,
  };
}

export function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function extractDayTheme(events: Event[]): string | null {
  if (events.length === 0) return null;
  const first = (events[0].description ?? "").trim();
  if (!first || first.length > 60) return null;
  const allSame = events.every((event) => (event.description ?? "").trim() === first);
  return allSame ? first : null;
}

export function groupEventsByDay(events: Event[]): EventGroup[] {
  const groups = new Map<number, { day: number; date: string; events: Event[] }>();
  for (const event of events) {
    const existing = groups.get(event.day);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(event.day, { day: event.day, date: event.date, events: [event] });
    }
  }
  return [...groups.values()]
    .sort((left, right) => left.day - right.day)
    .map((group) => ({ ...group, theme: extractDayTheme(group.events) }));
}
