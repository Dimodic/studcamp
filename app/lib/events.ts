export interface SplitEventTitle {
  title: string;
  teacher: string | null;
}

const TRAILING_PARENS = /\s*\(([^()]+)\)\s*$/;

export function splitEventTitle(rawTitle: string): SplitEventTitle {
  const match = rawTitle.match(TRAILING_PARENS);
  if (!match || match.index === undefined) {
    return { title: rawTitle.trim(), teacher: null };
  }

  const beforeParens = rawTitle.slice(0, match.index).trim();
  const inside = match[1].trim();

  if (!beforeParens || !looksLikePersonName(inside)) {
    return { title: rawTitle.trim(), teacher: null };
  }

  return { title: beforeParens, teacher: inside };
}

function looksLikePersonName(value: string): boolean {
  if (value.length < 3 || value.length > 80) return false;
  if (/[0-9]/.test(value)) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((word) => /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё.'\-]*$/.test(word));
}
