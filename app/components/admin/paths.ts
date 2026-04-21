import type { AdminResourcePath } from "../../lib/domain";

export type AdminEntityKind =
  | "story"
  | "orgUpdate"
  | "event"
  | "user"
  | "project"
  | "material"
  | "resource"
  | "campusCategory"
  | "roomAssignment"
  | "document";

export interface AdminOption {
  id: string;
  label: string;
}

export const ADMIN_PATHS: Record<AdminEntityKind, AdminResourcePath> = {
  story: "stories",
  orgUpdate: "org-updates",
  event: "events",
  user: "users",
  project: "projects",
  material: "materials",
  resource: "resources",
  campusCategory: "campus-categories",
  roomAssignment: "room-assignments",
  document: "documents",
};

export const ENTITY_NOUN: Record<AdminEntityKind, string> = {
  story: "сторис",
  orgUpdate: "уведомление",
  event: "занятие",
  user: "пользователя",
  project: "проект",
  material: "материал",
  resource: "ссылку",
  campusCategory: "раздел кампуса",
  roomAssignment: "заселение",
  document: "документ",
};

export function editorTitle(kind: AdminEntityKind, mode: "create" | "edit"): string {
  return `${mode === "create" ? "Создать" : "Редактировать"} ${ENTITY_NOUN[kind]}`;
}
