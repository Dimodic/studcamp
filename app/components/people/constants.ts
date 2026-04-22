import type { UserRole } from "../../lib/domain";

export const ROLE_ORDER: Record<UserRole, number> = {
  organizer: 0,
  teacher: 1,
  participant: 2,
};

export const FILTER_OPTIONS: Array<{ key: "all" | UserRole; label: string }> = [
  { key: "all", label: "Все" },
  { key: "participant", label: "Участники" },
  { key: "teacher", label: "Преподаватели" },
  { key: "organizer", label: "Организаторы" },
];
