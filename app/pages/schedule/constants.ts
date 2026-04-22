import { BookOpen, CheckSquare, File, FileText, Video, type LucideIcon } from "lucide-react";

export const MATERIAL_TYPE_ACCENT: Record<string, string> = {
  presentation: "var(--accent-blue)",
  recording: "var(--accent-pink)",
  guide: "var(--accent-violet)",
  checklist: "var(--accent-teal)",
  org_doc: "var(--text-secondary)",
};

export const ATTACHMENT_ICONS: Record<string, LucideIcon> = {
  presentation: FileText,
  recording: Video,
  guide: BookOpen,
  checklist: CheckSquare,
  org_doc: File,
};

export const RESOURCE_KIND_LABELS: Record<string, string> = {
  doc: "Документ",
  sheet: "Таблица",
  form: "Форма",
  folder: "Папка",
  calendar: "Календарь",
  gallery: "Галерея",
  map: "Карта",
  repo: "Репозиторий",
  guide: "Гайд",
};
