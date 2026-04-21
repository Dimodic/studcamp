import type {
  DocumentStatus,
  EventAttendance,
  EventStatus,
  MaterialType,
  ResourceCategory,
  ResourceKind,
  StoryType,
  UpdateType,
  UserRole,
  VisibilityMode,
} from "./domain";

interface Option<Value extends string> {
  value: Value;
  label: string;
}

interface BadgeStyle {
  bg: string;
  color: string;
}

export const STORY_TYPE_OPTIONS: Option<StoryType>[] = [
  { value: "info", label: "Информация" },
  { value: "urgent", label: "Важное" },
  { value: "navigation", label: "Навигация" },
  { value: "project", label: "Проект" },
];

export const UPDATE_TYPE_OPTIONS: Option<UpdateType>[] = [
  { value: "change", label: "Изменение" },
  { value: "info", label: "Информация" },
  { value: "urgent", label: "Срочно" },
];

export const EVENT_STATUS_OPTIONS: Option<EventStatus>[] = [
  { value: "upcoming", label: "По плану" },
  { value: "in_progress", label: "Идёт сейчас" },
  { value: "completed", label: "Завершено" },
  { value: "changed", label: "Изменено" },
  { value: "cancelled", label: "Отменено" },
];

export const EVENT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

export const EVENT_STATUS_STYLES: Record<string, BadgeStyle> = {
  upcoming: { bg: "var(--bg-subtle)", color: "var(--text-secondary)" },
  in_progress: { bg: "var(--success-soft)", color: "var(--success)" },
  completed: { bg: "var(--bg-subtle)", color: "var(--text-tertiary)" },
  changed: { bg: "var(--warning-soft)", color: "var(--warning)" },
  cancelled: { bg: "var(--danger-soft)", color: "var(--danger)" },
};

export const EVENT_ATTENDANCE_OPTIONS: Option<EventAttendance>[] = [
  { value: "confirmed", label: "Подтверждено" },
  { value: "pending", label: "Ожидание" },
  { value: "not_checked", label: "Без отметки" },
];

export const ROLE_OPTIONS: Option<UserRole>[] = [
  { value: "participant", label: "Участник" },
  { value: "teacher", label: "Преподаватель" },
  { value: "organizer", label: "Организатор" },
];

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label]),
);

export const ROLE_STYLES: Record<string, BadgeStyle> = {
  participant: { bg: "var(--bg-subtle)", color: "var(--text-secondary)" },
  teacher: { bg: "var(--info-soft)", color: "var(--info)" },
  organizer: { bg: "var(--warning-soft)", color: "var(--warning)" },
};

export const VISIBILITY_OPTIONS: Option<VisibilityMode>[] = [
  { value: "name_only", label: "Только имя" },
  { value: "name_plus_fields", label: "Имя и контакты" },
];

export const MATERIAL_TYPE_OPTIONS: Option<MaterialType>[] = [
  { value: "presentation", label: "Презентация" },
  { value: "recording", label: "Запись" },
  { value: "guide", label: "Гайд" },
  { value: "checklist", label: "Чек-лист" },
  { value: "org_doc", label: "Орг. документ" },
];

export const MATERIAL_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MATERIAL_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export const RESOURCE_CATEGORY_OPTIONS: Option<ResourceCategory>[] = [
  { value: "study", label: "Учёба" },
  { value: "projects", label: "Проекты" },
  { value: "logistics", label: "Логистика" },
  { value: "housing", label: "Проживание" },
  { value: "forms", label: "Формы" },
  { value: "media", label: "Медиа" },
];

export const RESOURCE_KIND_OPTIONS: Option<ResourceKind>[] = [
  { value: "doc", label: "Документ" },
  { value: "sheet", label: "Таблица" },
  { value: "form", label: "Форма" },
  { value: "folder", label: "Папка" },
  { value: "calendar", label: "Календарь" },
  { value: "gallery", label: "Галерея" },
  { value: "map", label: "Карта" },
  { value: "repo", label: "Репозиторий" },
  { value: "guide", label: "Гайд" },
];

export const DOCUMENT_STATUS_OPTIONS: Option<DocumentStatus>[] = [
  { value: "not_started", label: "Не начато" },
  { value: "in_progress", label: "В процессе" },
  { value: "done", label: "Готово" },
  { value: "blocked", label: "Заблокировано" },
];
