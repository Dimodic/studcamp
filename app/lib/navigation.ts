import { Calendar, FolderKanban, Home, User, Users, type LucideIcon } from "lucide-react";

export type NavigationItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  isPrimary: boolean;
};

export const navigationItems: NavigationItem[] = [
  { path: "/", icon: Home, label: "Главная", isPrimary: true },
  { path: "/schedule", icon: Calendar, label: "Расписание", isPrimary: true },
  { path: "/people", icon: Users, label: "Люди", isPrimary: true },
  { path: "/projects", icon: FolderKanban, label: "Проекты", isPrimary: true },
  { path: "/profile", icon: User, label: "Профиль", isPrimary: true },
];

const primaryPaths = new Set(
  navigationItems.filter((item) => item.isPrimary).map((item) => item.path),
);

export function isPrimaryRoute(pathname: string) {
  return primaryPaths.has(pathname);
}

export function getActivePrimaryPath(pathname: string) {
  return isPrimaryRoute(pathname) ? pathname : null;
}
