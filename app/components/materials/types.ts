import type { Camp, Material } from "../../lib/domain";

export interface DateParts {
  dayNumber: string;
  month: string;
  weekday: string;
}

export interface DayGroup {
  day: number;
  date: Date | null;
  materials: Material[];
}

export function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function dateForDay(camp: Camp, day: number): Date | null {
  const start = parseDate(camp.dates.start);
  if (!start) return null;
  return new Date(start.getTime() + (day - 1) * 86400000);
}

export function formatDayHeader(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .toUpperCase();
}

export function extractDateParts(date: Date): DateParts {
  const dayNumber = new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date);
  const month = new Intl.DateTimeFormat("ru-RU", { month: "short" })
    .format(date)
    .replace(/\.$/, "");
  return {
    dayNumber,
    month,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
  };
}

export function groupMaterialsByDay(
  materials: Material[],
  camp: Camp,
): { groups: DayGroup[]; undated: Material[] } {
  const byDay = new Map<number, Material[]>();
  const undated: Material[] = [];

  for (const material of materials) {
    if (material.type === "org_doc") {
      continue;
    }
    if (material.day == null) {
      undated.push(material);
      continue;
    }
    const bucket = byDay.get(material.day) ?? [];
    bucket.push(material);
    byDay.set(material.day, bucket);
  }

  const groups: DayGroup[] = [...byDay.entries()]
    .map(([day, items]) => ({
      day,
      date: dateForDay(camp, day),
      materials: items.sort((a, b) => {
        return a.title.localeCompare(b.title, "ru");
      }),
    }))
    .sort((a, b) => a.day - b.day);

  return { groups, undated };
}
