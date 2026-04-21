import type { Event as CampEvent } from "./domain";

export interface SplitEventTitle {
  title: string;
  teacher: string | null;
}

// Регулярка совпадает с серверной `_counts_for_attendance` — питание, свободная
// работа над проектом, экскурсии и прочие не-учебные форматы. Используется как
// фолбэк на фронте, если `event.countsForAttendance` ещё не приехал в bootstrap
// (например старый закешированный snapshot).
const NON_COUNTED_RE =
  /(завтрак|обед|ужин|кофе|работ[аы]?\s+над\s+проектам|регистрац|отъезд|экскурс|мероприят|знакомств|вручен|открыт|закрыт|гитарник)/i;

export function isCountableEvent(event: Pick<CampEvent, "type" | "title" | "countsForAttendance">): boolean {
  if (event.countsForAttendance === false) return false;
  if (event.countsForAttendance === true) return true;
  const haystack = `${event.type ?? ""} ${event.title ?? ""}`;
  return !NON_COUNTED_RE.test(haystack);
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
