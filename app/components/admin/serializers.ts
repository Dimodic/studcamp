export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function splitCsvOrLines(value: string): string[] {
  return value
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinLines(value?: string[] | null): string {
  return (value ?? []).join("\n");
}

export function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === "" || value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toNumberOrFallback(
  value: string | number | null | undefined,
  fallback: number,
): number {
  const parsed = toNumberOrNull(value);
  return parsed ?? fallback;
}

export function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
