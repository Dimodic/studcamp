export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function formatShortDate(value?: string | null): string | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
    .format(parsed)
    .replace(/\.$/, "");
}

export function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
