import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Building2, ChevronRight, CreditCard, FileText, FolderOpen, LogOut, RefreshCw, Shield } from "lucide-react";
import { Avatar, PageShell, RoleBadge, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";

export function ProfilePage() {
  const navigate = useNavigate();
  const { data, logout, updateProfilePreferences, syncStatus } = useAppData();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!data) {
    return null;
  }

  const { currentUser, camp, events } = data;
  const teacherEvents = events.filter((event) => event.teacherIds.includes(currentUser.id));
  const adminShortcuts = [
    { label: "Создать занятие", path: "/schedule?admin=create-event" },
    { label: "Создать уведомление", path: "/?admin=create-update" },
    { label: "Создать пользователя", path: "/people?admin=create-user" },
    { label: "Создать сторис", path: "/?admin=create-story" },
    { label: "Добавить материал", path: "/materials?admin=create-material" },
    { label: "Добавить кампусный блок", path: "/campus?admin=create-campus-category" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-[var(--text-primary)]">Профиль</h1>
      </div>

      <div className="px-5 pb-8 lg:grid lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-6">
        <div className="mb-4 lg:mb-0 lg:col-[1]">
          <SurfaceCard className="p-5">
            <div className="flex items-center gap-4">
              <Avatar name={currentUser.name} size={64} />
              <div>
                <h2 className="text-[var(--text-primary)] mb-1">{currentUser.name}</h2>
                <p className="text-[14px] mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  {currentUser.university} · {currentUser.city}
                </p>
                <RoleBadge role={currentUser.role} />
              </div>
            </div>
          </SurfaceCard>
        </div>

        {currentUser.capabilities.canManageAll && (
          <div className="mb-4 lg:mb-0 lg:col-[2]">
            <SurfaceCard className="p-5">
              <p className="text-[13px] mb-3" style={{ color: "var(--text-tertiary)" }}>Admin tools</p>
              <div className="grid grid-cols-2 gap-2">
                {adminShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.path}
                    onClick={() => navigate(shortcut.path)}
                    className="text-left rounded-[var(--radius-md)] px-3 py-3 border text-[14px]"
                    style={{ borderColor: "var(--line-subtle)", color: "var(--text-primary)", background: "var(--bg-app)" }}
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </SurfaceCard>
          </div>
        )}

        {currentUser.capabilities.canEditOwnEvents && (
          <div className="mb-4 lg:mb-0 lg:col-[2]">
            <SurfaceCard className="p-5">
              <p className="text-[13px] mb-3" style={{ color: "var(--text-tertiary)" }}>Мои занятия</p>
              <div className="space-y-2">
                {teacherEvents.length > 0 ? (
                  teacherEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/schedule?event=${event.id}`)}
                      className="w-full text-left rounded-[var(--radius-md)] px-3 py-3 border"
                      style={{ borderColor: "var(--line-subtle)", color: "var(--text-primary)", background: "var(--bg-app)" }}
                    >
                      <p className="text-[14px]" style={{ fontWeight: 500 }}>{event.title}</p>
                      <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        {event.date} · {event.startAt}–{event.endAt}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                    Для этого преподавателя пока не привязано ни одного занятия.
                  </p>
                )}
              </div>
            </SurfaceCard>
          </div>
        )}

        <div className="mb-4 lg:mb-0 lg:col-[1]">
          <SurfaceCard className="p-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-[13px] mb-1" style={{ color: "var(--text-tertiary)" }}>Текущий студкемп</p>
                <p className="text-[16px] mb-0.5" style={{ color: "var(--text-primary)", fontWeight: 500 }}>{camp.name}</p>
                <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  {camp.city} · {camp.university}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]" style={{ color: syncStatus === "stale" ? "var(--warning)" : "var(--text-tertiary)" }}>
                <RefreshCw size={14} className={syncStatus === "syncing" ? "animate-spin" : ""} />
                {syncStatus === "fresh" ? "Синхронизировано" : syncStatus === "stale" ? "Кэш без связи" : "Готово"}
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="mb-4 lg:mb-0 lg:col-[2]">
          <SurfaceCard className="divide-y" style={{ borderColor: "var(--line-subtle)" }}>
            {[
              { icon: CreditCard, label: "Бейдж участника", path: "/profile/badge" },
              { icon: FileText, label: "Мои документы", path: "/documents" },
              { icon: FolderOpen, label: "Материалы", path: "/materials" },
              { icon: Building2, label: "Кампус и проживание", path: "/campus" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left min-h-[52px]"
              >
                <item.icon size={19} style={{ color: "var(--text-tertiary)" }} />
                <span className="flex-1 text-[15px]" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                <ChevronRight size={17} style={{ color: "var(--text-tertiary)" }} />
              </button>
            ))}

            <button
              onClick={() =>
                void updateProfilePreferences({
                  visibilityMode: currentUser.visibility === "name_only" ? "name_plus_fields" : "name_only",
                })
              }
              className="w-full flex items-center gap-3 px-5 py-4 text-left min-h-[52px]"
            >
              <Shield size={19} style={{ color: "var(--text-tertiary)" }} />
              <div className="flex-1">
                <span className="text-[15px] block" style={{ color: "var(--text-primary)" }}>Видимость профиля</span>
                <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                  {currentUser.visibility === "name_only" ? "Только ФИО" : "ФИО + детали"}
                </span>
              </div>
              <div
                className="w-11 h-[26px] rounded-full relative transition-colors shrink-0"
                style={{ background: currentUser.visibility === "name_plus_fields" ? "var(--brand)" : "var(--line-strong)" }}
              >
                <div
                  className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ left: currentUser.visibility === "name_plus_fields" ? 22 : 3 }}
                />
              </div>
            </button>

            <button
              onClick={() =>
                void updateProfilePreferences({
                  notificationsOn: !currentUser.notificationsOn,
                })
              }
              className="w-full flex items-center gap-3 px-5 py-4 text-left min-h-[52px]"
            >
              <Bell size={19} style={{ color: "var(--text-tertiary)" }} />
              <span className="flex-1 text-[15px]" style={{ color: "var(--text-primary)" }}>Уведомления</span>
              <div
                className="w-11 h-[26px] rounded-full relative transition-colors"
                style={{ background: currentUser.notificationsOn ? "var(--brand)" : "var(--line-strong)" }}
              >
                <div
                  className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ left: currentUser.notificationsOn ? 22 : 3 }}
                />
              </div>
            </button>
          </SurfaceCard>
        </div>

        <div className="lg:col-[1] lg:self-start">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] text-[15px] border"
            style={{ color: "var(--danger)", borderColor: "var(--line-subtle)", background: "var(--bg-card)" }}
          >
            <LogOut size={17} /> Выйти
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.25)" }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="rounded-[var(--radius-xl)] p-6 w-full max-w-sm" style={{ background: "var(--bg-card)" }} onClick={(event) => event.stopPropagation()}>
            <h3 className="text-[var(--text-primary)] text-center mb-2">Выйти из аккаунта?</h3>
            <p className="text-[14px] text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              Кэшированные данные останутся на устройстве до следующей синхронизации.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-[var(--radius-md)] text-[15px]"
                style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
              >
                Отмена
              </button>
              <button
                onClick={() => void handleLogout()}
                className="flex-1 py-3 rounded-[var(--radius-md)] text-[15px]"
                style={{ background: "var(--danger)", color: "var(--text-inverted)" }}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
