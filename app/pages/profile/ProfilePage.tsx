import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  FolderOpen,
  LogOut,
  MapPin,
  Repeat,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Avatar, PageShell, ProgressRing, SurfaceCard } from "../../components/common";
import { MagicBlock } from "./MagicBlock";
import { CampSwitcher } from "./CampSwitcher";
import { useAppData } from "../../lib/app-data";
import { ROLE_LABELS, ROLE_STYLES } from "../../lib/options";
import { closeTelegramWebApp, isTelegramWebApp } from "../../lib/telegram";

const QUICK_LINKS: Array<{
  icon: LucideIcon;
  label: string;
  description: string;
  path: string;
  accent: string;
}> = [
  {
    icon: CreditCard,
    label: "Бейдж участника",
    description: "QR-код для входа и зон",
    path: "/profile/badge",
    accent: "var(--accent-blue)",
  },
  {
    icon: FileText,
    label: "Мои документы",
    description: "Заявления и анкеты",
    path: "/documents",
    accent: "var(--accent-lilac)",
  },
  {
    icon: FolderOpen,
    label: "Материалы",
    description: "Презентации и записи",
    path: "/materials",
    accent: "var(--accent-teal)",
  },
  {
    icon: Building2,
    label: "Кампус",
    description: "Проживание и логистика",
    path: "/campus",
    accent: "var(--accent-violet)",
  },
];

function formatCampDates(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return `${start} — ${end}`;
  }
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const yearFormatter = new Intl.DateTimeFormat("ru-RU", { year: "numeric" });
  return `${formatter.format(startDate)} — ${formatter.format(endDate)} ${yearFormatter.format(endDate)}`;
}

interface ToggleRowProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleRow({ icon: Icon, label, description, checked, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-subtle)]"
    >
      <div
        className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className="text-[14.5px] block"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          {label}
        </span>
        {description && (
          <span className="text-[12.5px] block mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {description}
          </span>
        )}
      </div>
      <div
        className="w-11 h-[26px] rounded-full relative transition-colors shrink-0"
        style={{ background: checked ? "var(--brand)" : "var(--line-strong)" }}
      >
        <div
          className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-transform"
          style={{
            left: checked ? 22 : 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      </div>
    </button>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { data, logout, updateProfilePreferences } = useAppData();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [campSwitcherOpen, setCampSwitcherOpen] = useState(false);

  if (!data) {
    return null;
  }

  const { currentUser, camp, events } = data;
  const canSwitchCamps = currentUser.capabilities.canManageUsers;
  const teacherEvents = events.filter((event) => event.teacherIds.includes(currentUser.id));

  const insideTelegram = isTelegramWebApp();

  const handleLogout = async () => {
    await logout();
    if (insideTelegram) {
      // В Telegram WebApp перелогин невозможен (identity привязана к
      // Telegram-аккаунту). Просто закрываем окно — при следующем открытии
      // бот снова автоматически авторизует пользователя.
      closeTelegramWebApp();
      return;
    }
    void navigate("/login", { replace: true });
  };

  const roleStyle = ROLE_STYLES[currentUser.role] ?? ROLE_STYLES.participant;
  const universityAndCity = [currentUser.university, currentUser.city].filter(Boolean).join(" · ");

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-[var(--text-primary)]">Профиль</h1>
      </div>

      <div className="px-5 pb-8 space-y-6">
        <SurfaceCard className="overflow-hidden">
          <div className="px-5 sm:px-6 pt-6 pb-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar name={currentUser.name} size={72} />
              <div className="flex-1 min-w-0">
                <h2
                  className="text-[22px] leading-tight mb-1"
                  style={{ color: "var(--text-primary)", fontWeight: 600 }}
                >
                  {currentUser.name}
                </h2>
                {universityAndCity && (
                  <p className="text-[14px] mb-2" style={{ color: "var(--text-secondary)" }}>
                    {universityAndCity}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]"
                    style={{ background: roleStyle.bg, color: roleStyle.color, fontWeight: 500 }}
                  >
                    {ROLE_LABELS[currentUser.role] ?? currentUser.role}
                  </span>
                  {currentUser.email && (
                    <span
                      className="text-[12.5px] truncate max-w-full"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {currentUser.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {currentUser.role === "participant" && currentUser.attendance && (
              <div
                className="shrink-0 self-stretch lg:self-start flex items-center gap-3 rounded-[var(--radius-md)] p-3 pr-4"
                style={{ background: "var(--bg-subtle)" }}
                title={
                  currentUser.attendance.total > 0
                    ? `Вы присутствовали на ${currentUser.attendance.present} из ${currentUser.attendance.total} засчитываемых занятий`
                    : "Посещаемость появится после первых занятий"
                }
              >
                <ProgressRing
                  value={currentUser.attendance.percentage}
                  size={56}
                  stroke={5}
                  baseColor="var(--bg-card)"
                />
                <div className="min-w-0">
                  <p
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                  >
                    Посещаемость
                  </p>
                  <p
                    className="text-[13px] leading-tight mt-0.5"
                    style={{ color: "var(--text-primary)", fontWeight: 500 }}
                  >
                    {currentUser.attendance.total > 0
                      ? `${currentUser.attendance.present} из ${currentUser.attendance.total} занятий`
                      : "Ждём первые занятия"}
                  </p>
                  {currentUser.attendance.closed && (
                    <p
                      className="text-[11.5px] mt-0.5"
                      style={{ color: "var(--success)", fontWeight: 600 }}
                    >
                      ✓ Закрыта
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className="px-5 sm:px-6 py-4 flex items-center gap-4 border-t"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--line-subtle)" }}
          >
            <div
              className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
              style={{ background: "var(--brand-soft)", color: "var(--text-primary)" }}
            >
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[11px] uppercase tracking-wider mb-0.5"
                style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
              >
                Студкемп
              </p>
              <p
                className="text-[14.5px] leading-tight"
                style={{ color: "var(--text-primary)", fontWeight: 600 }}
              >
                {camp.name}
              </p>
              <p
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {camp.city}
                </span>
                <span aria-hidden="true">·</span>
                <span>{camp.university}</span>
                <span aria-hidden="true">·</span>
                <span>{formatCampDates(camp.dates.start, camp.dates.end)}</span>
              </p>
            </div>
            {canSwitchCamps && (
              <button
                type="button"
                onClick={() => setCampSwitcherOpen(true)}
                className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-full transition-colors hover:bg-[var(--bg-card)] shrink-0"
                style={{
                  border: "1px solid var(--line-subtle)",
                  color: "var(--text-secondary)",
                  background: "var(--bg-card)",
                }}
              >
                <Repeat size={13} /> Переключить
              </button>
            )}
          </div>
        </SurfaceCard>

        {canSwitchCamps && (
          <CampSwitcher
            open={campSwitcherOpen}
            currentCampId={camp.id}
            onClose={() => setCampSwitcherOpen(false)}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="group flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border text-left transition-colors hover:bg-[var(--bg-subtle)]"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--line-subtle)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${link.accent} 14%, transparent)`,
                    color: link.accent,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[15px]"
                    style={{ color: "var(--text-primary)", fontWeight: 500 }}
                  >
                    {link.label}
                  </p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {link.description}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  style={{ color: "var(--text-tertiary)" }}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            );
          })}
        </div>

        <SurfaceCard className="overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-2">
            <p
              className="text-[11px] uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
            >
              Настройки
            </p>
          </div>
          <ToggleRow
            icon={Shield}
            label="Видимость профиля"
            description={
              currentUser.visibility === "name_only" ? "Только ФИО" : "ФИО + контакты и вуз"
            }
            checked={currentUser.visibility === "name_plus_fields"}
            onToggle={() =>
              void updateProfilePreferences({
                visibilityMode:
                  currentUser.visibility === "name_only" ? "name_plus_fields" : "name_only",
              })
            }
          />
          <div className="h-px mx-5 sm:mx-6" style={{ background: "var(--line-subtle)" }} />
          <ToggleRow
            icon={Bell}
            label="Уведомления"
            description={currentUser.notificationsOn ? "Сторис и важные обновления" : "Отключены"}
            checked={currentUser.notificationsOn}
            onToggle={() =>
              void updateProfilePreferences({
                notificationsOn: !currentUser.notificationsOn,
              })
            }
          />
        </SurfaceCard>

        {currentUser.capabilities.canManageAll ? (
          <MagicBlock />
        ) : (
          currentUser.capabilities.canEditOwnEvents && (
            <SurfaceCard className="p-5 sm:p-6">
              <p
                className="text-[11px] uppercase tracking-wider mb-3"
                style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
              >
                Мои занятия
              </p>
              {teacherEvents.length === 0 ? (
                <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  Пока не привязано ни одного занятия.
                </p>
              ) : (
                <div className="space-y-2">
                  {teacherEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/schedule?event=${event.id}`)}
                      className="w-full text-left rounded-[var(--radius-md)] px-4 py-3 border transition-colors hover:bg-[var(--bg-subtle)]"
                      style={{ borderColor: "var(--line-subtle)", background: "var(--bg-card)" }}
                    >
                      <p
                        className="text-[14.5px]"
                        style={{ fontWeight: 500, color: "var(--text-primary)" }}
                      >
                        {event.title}
                      </p>
                      <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {event.date} · {event.startAt}–{event.endAt}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </SurfaceCard>
          )
        )}

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[var(--radius-md)] text-[15px] border transition-colors hover:bg-[var(--danger-soft)]"
          style={{
            color: "var(--danger)",
            borderColor: "var(--line-subtle)",
            background: "var(--bg-card)",
            fontWeight: 500,
          }}
        >
          <LogOut size={17} /> {insideTelegram ? "Закрыть приложение" : "Выйти из аккаунта"}
        </button>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="rounded-[var(--radius-xl)] p-6 w-full max-w-sm"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-floating)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[var(--text-primary)] text-center mb-2">
              {insideTelegram ? "Закрыть приложение?" : "Выйти из аккаунта?"}
            </h3>
            <p className="text-[14px] text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              {insideTelegram
                ? "При следующем открытии Telegram снова авторизует вас автоматически."
                : "Кэшированные данные останутся на устройстве до следующей синхронизации."}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-[var(--radius-md)] text-[15px]"
                style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex-1 py-3 rounded-[var(--radius-md)] text-[15px]"
                style={{
                  background: "var(--danger)",
                  color: "var(--text-inverted)",
                  fontWeight: 500,
                }}
              >
                {insideTelegram ? "Закрыть" : "Выйти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
