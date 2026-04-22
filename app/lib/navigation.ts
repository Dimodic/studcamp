import {
  Calendar,
  ClipboardCheck,
  FolderKanban,
  Home,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  isPrimary: boolean;
  organizerOnly?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { path: "/", icon: Home, label: "Главная", isPrimary: true },
  { path: "/schedule", icon: Calendar, label: "Расписание", isPrimary: true },
  { path: "/people", icon: Users, label: "Люди", isPrimary: true },
  { path: "/projects", icon: FolderKanban, label: "Проекты", isPrimary: true },
  {
    path: "/attendance",
    icon: ClipboardCheck,
    label: "Посещаемость",
    isPrimary: true,
    organizerOnly: true,
  },
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

export function filterNavigation(
  items: NavigationItem[],
  { canManageUsers }: { canManageUsers: boolean },
): NavigationItem[] {
  return items.filter((item) => !item.organizerOnly || canManageUsers);
}
