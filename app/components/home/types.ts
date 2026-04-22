import type { LucideIcon } from "lucide-react";

export interface QuickLink {
  icon: LucideIcon;
  label: string;
  description: string;
  accent: string;
  onClick: () => void;
}
