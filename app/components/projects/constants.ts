import { Check, Hourglass, Sparkles, Trophy, type LucideIcon } from "lucide-react";

import type { ProjectSelectionPhase } from "../../lib/domain";

export const PHASE_COPY: Record<
  ProjectSelectionPhase,
  { icon: LucideIcon; accent: string; title: string; description: string }
> = {
  countdown: {
    icon: Hourglass,
    accent: "var(--info)",
    title: "Выбор скоро откроется",
    description: "Следите за орг-обновлениями и заранее посмотрите карточки проектов.",
  },
  open: {
    icon: Sparkles,
    accent: "var(--warning)",
    title: "Расставьте приоритеты",
    description: "Выберите до 5 проектов в порядке важности и сохраните выбор.",
  },
  closed: {
    icon: Check,
    accent: "var(--success)",
    title: "Выбор проектов завершён",
    description: "Ваши приоритеты отправлены. Организаторы распределяют участников по проектам.",
  },
  results: {
    icon: Trophy,
    accent: "var(--brand-contrast)",
    title: "Результаты опубликованы",
    description: "Ниже — карточка вашего ментора с проектами, остальные менторы как справочник.",
  },
};

export const PHASE_OPTIONS: { value: ProjectSelectionPhase; label: string }[] = [
  { value: "countdown", label: "Скоро выбор" },
  { value: "open", label: "Приоритеты" },
  { value: "closed", label: "Распределение" },
  { value: "results", label: "Результаты" },
];
