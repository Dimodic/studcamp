import { AlertTriangle, ArrowLeft, Bell, Info, RefreshCw } from "lucide-react";

import type { CurrentUser, OrgUpdate } from "../../lib/domain";
import { ActionIconButton } from "../../components/admin";

interface NotificationsOverlayProps {
  updates: OrgUpdate[];
  currentUser: CurrentUser;
  onClose: () => void;
  onCreateUpdate: () => void;
  onEditUpdate: (update: OrgUpdate) => void;
  onToggleHidden: (update: OrgUpdate) => void;
  onDeleteUpdate: (update: OrgUpdate) => void;
}

export function NotificationsOverlay({
  updates,
  currentUser,
  onClose,
  onCreateUpdate,
  onEditUpdate,
  onToggleHidden,
  onDeleteUpdate,
}: NotificationsOverlayProps) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--bg-app)" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--line-subtle)", background: "var(--bg-card)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-subtle)]"
          style={{ color: "var(--text-primary)" }}
          aria-label="Закрыть"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="flex-1 text-[var(--text-primary)]">Уведомления</h2>
        {currentUser.capabilities.canManageUpdates && (
          <ActionIconButton
            kind="plus"
            label="Создать уведомление"
            onClick={(event) => {
              event.preventDefault();
              onCreateUpdate();
            }}
          />
        )}
        {updates.length > 0 && (
          <span
            className="text-[12.5px] px-2 py-0.5 rounded-full"
            style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}
          >
            {updates.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
            <Bell size={40} style={{ color: "var(--line-strong)" }} />
            <p className="text-[15px] text-center" style={{ color: "var(--text-tertiary)" }}>
              Нет новых уведомлений
            </p>
          </div>
        ) : (
          <div className="max-w-lg mx-auto px-4 py-4 space-y-2.5">
            {updates.map((update) => {
              const accent =
                update.type === "urgent"
                  ? "var(--danger)"
                  : update.type === "change"
                    ? "var(--warning)"
                    : "var(--info)";
              const icon =
                update.type === "urgent" ? (
                  <AlertTriangle size={16} />
                ) : update.type === "change" ? (
                  <RefreshCw size={16} />
                ) : (
                  <Info size={16} />
                );
              return (
                <div
                  key={update.id}
                  className="rounded-[var(--radius-lg)] p-4 flex items-start gap-3 border"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--line-subtle)",
                    opacity: update.isHidden ? 0.55 : 1,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                      color: accent,
                    }}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] leading-snug"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {update.text}
                    </p>
                    <p className="text-[12px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>
                      {update.time}
                    </p>
                  </div>
                  {currentUser.capabilities.canManageUpdates && (
                    <div className="flex items-center gap-1.5">
                      <ActionIconButton
                        kind="edit"
                        label="Редактировать уведомление"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onEditUpdate(update);
                        }}
                      />
                      <ActionIconButton
                        kind={update.isHidden ? "show" : "hide"}
                        label={update.isHidden ? "Показать участникам" : "Скрыть от участников"}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleHidden(update);
                        }}
                      />
                      <ActionIconButton
                        kind="delete"
                        label="Удалить уведомление"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (window.confirm("Удалить уведомление?")) {
                            onDeleteUpdate(update);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
