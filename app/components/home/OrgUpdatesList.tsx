import { SurfaceCard } from "../common";
import type { OrgUpdate } from "../../lib/domain";

interface OrgUpdatesListProps {
  updates: OrgUpdate[];
  onOpenNotifications: () => void;
}

export function OrgUpdatesList({ updates, onOpenNotifications }: OrgUpdatesListProps) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-2">
        <p
          className="text-[11px] uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          Последние обновления
        </p>
      </div>
      {updates.length === 0 ? (
        <p className="text-[13.5px] px-4 sm:px-5 pb-5" style={{ color: "var(--text-tertiary)" }}>
          Новых обновлений пока нет.
        </p>
      ) : (
        <div className="pb-2">
          {updates.slice(0, 4).map((update) => {
            const accent =
              update.type === "urgent"
                ? "var(--danger)"
                : update.type === "change"
                  ? "var(--warning)"
                  : "var(--info)";
            const typeLabel =
              update.type === "urgent" ? "Срочно" : update.type === "change" ? "Изменение" : "Инфо";
            return (
              <button
                key={update.id}
                onClick={onOpenNotifications}
                className="w-full text-left px-4 sm:px-5 py-3 transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                      color: accent,
                      fontWeight: 700,
                    }}
                  >
                    {typeLabel}
                  </span>
                  <span className="text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>
                    {update.time}
                  </span>
                </div>
                <p
                  className="text-[13px] leading-snug line-clamp-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {update.text}
                </p>
              </button>
            );
          })}
          {updates.length > 4 && (
            <button
              onClick={onOpenNotifications}
              className="w-full text-center px-4 py-3 text-[12.5px] border-t transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: "var(--line-subtle)", color: "var(--text-secondary)" }}
            >
              Все уведомления ({updates.length})
            </button>
          )}
        </div>
      )}
    </SurfaceCard>
  );
}
