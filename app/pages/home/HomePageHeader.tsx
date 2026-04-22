import { Bell, CalendarDays, Pencil } from "lucide-react";

import type { Camp } from "../../lib/domain";

interface HomePageHeaderProps {
  camp: Camp;
  currentDay: number;
  totalDays: number;
  unreadCount: number;
  canEditCamp: boolean;
  onEditCamp: () => void;
  onOpenNotifications: () => void;
}

export function HomePageHeader({
  camp,
  currentDay,
  totalDays,
  unreadCount,
  canEditCamp,
  onEditCamp,
  onOpenNotifications,
}: HomePageHeaderProps) {
  return (
    <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p
          className="text-[13px] mb-1 flex items-center gap-1.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          <CalendarDays size={14} /> День {currentDay} из {totalDays} · Яндекс Образование
        </p>
        <div className="flex items-center gap-2">
          <h1 className="text-[var(--text-primary)]">{camp.name}</h1>
          {canEditCamp && (
            <button
              type="button"
              onClick={onEditCamp}
              aria-label="Редактировать кемп"
              title="Редактировать кемп"
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--line-subtle)" }}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>
      <button
        onClick={onOpenNotifications}
        aria-label="Уведомления"
        className="relative w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--bg-subtle)]"
        style={{ color: "var(--text-secondary)" }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center"
            style={{ background: "var(--danger)", color: "white", fontWeight: 700 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
