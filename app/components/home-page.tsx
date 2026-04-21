import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Building,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  Info,
  MapPin,
  Navigation,
  Pencil,
  RefreshCw,
  X,
  type LucideIcon,
} from "lucide-react";
import { StoryViewer } from "./story-viewer";
import { PageShell, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { splitEventTitle } from "../lib/events";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatShortDate(value?: string | null): string | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
    .format(parsed)
    .replace(/\.$/, "");
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

interface QuickLink {
  icon: LucideIcon;
  label: string;
  description: string;
  accent: string;
  onClick: () => void;
}

export function HomePage() {
  const navigate = useNavigate();
  const {
    data,
    markStoryRead,
    markUpdatesRead,
    createAdminEntity,
    updateAdminEntity,
    deleteAdminEntity,
    setEntityVisibility,
  } = useAppData();
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
  } | null>(null);
  useBodyScrollLock(showNotifications);

  if (!data) return null;

  const { camp, events, stories, orgUpdates: updates, documents, currentUser } = data;
  const inProgressEvent = events.find((event) => event.status === "in_progress");
  const firstUpcoming = events.find((event) => event.status === "upcoming");
  const nextEvent = inProgressEvent ?? firstUpcoming;
  const upcomingAfterCurrent = inProgressEvent ? firstUpcoming : null;
  const todayEvents = events.filter((event) => event.day === data.ui.currentDay);
  const readStories = new Set(stories.filter((story) => story.read).map((story) => story.id));
  const unreadCount = updates.filter((update) => !update.isRead).length;
  const nearestDeadline = documents
    .filter((document) => document.status !== "done" && document.deadline)
    .sort((left, right) => (left.deadline! > right.deadline! ? 1 : -1))[0];
  const canEditCamp = currentUser.capabilities.canManageAll;

  const openNotifications = () => {
    setShowNotifications(true);
    void markUpdatesRead(updates.filter((update) => !update.isRead).map((update) => update.id));
  };

  const openRoute = (eventAddress: string, fallbackPlace: string) => {
    const query = eventAddress || fallbackPlace;
    if (!query) return;
    openExternal(`https://yandex.ru/maps/?text=${encodeURIComponent(query)}`);
  };

  const quickLinks: QuickLink[] = [
    {
      icon: CreditCard,
      label: "Бейдж",
      description: "QR-код участника",
      accent: "var(--accent-blue)",
      onClick: () => navigate("/profile/badge"),
    },
    {
      icon: FileText,
      label: "Документы",
      description: "Заявления и анкеты",
      accent: "var(--accent-lilac)",
      onClick: () => navigate("/documents"),
    },
    {
      icon: FolderOpen,
      label: "Материалы",
      description: "Записи и презентации",
      accent: "var(--accent-teal)",
      onClick: () => navigate("/materials"),
    },
    {
      icon: Building,
      label: "Кампус",
      description: "Проживание и связь",
      accent: "var(--accent-violet)",
      onClick: () => navigate("/campus"),
    },
  ];

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[13px] mb-1 flex items-center gap-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            <CalendarDays size={14} /> День {data.ui.currentDay} из {data.ui.totalDays} · Яндекс Образование
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-[var(--text-primary)]">{camp.name}</h1>
            {canEditCamp && (
              <button
                type="button"
                onClick={() => setAdminState({ kind: "camp", mode: "edit", entity: camp })}
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
          onClick={openNotifications}
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

      {stories.length > 0 && (
        <div className="px-5 pb-5">
          {currentUser.capabilities.canManageStories && (
            <div className="flex justify-end mb-2">
              <ActionIconButton
                kind="plus"
                label="Создать сторис"
                onClick={(event) => {
                  event.preventDefault();
                  setAdminState({ kind: "story", mode: "create" });
                }}
              />
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="relative shrink-0"
                style={{ opacity: story.isHidden ? 0.5 : 1 }}
              >
                {currentUser.capabilities.canManageStories && (
                  <>
                    <ActionIconButton
                      kind="edit"
                      label={`Редактировать ${story.title}`}
                      className="absolute -top-1 -right-1 z-10"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setAdminState({ kind: "story", mode: "edit", entity: story });
                      }}
                    />
                    <ActionIconButton
                      kind="delete"
                      label={`Удалить ${story.title}`}
                      className="absolute -bottom-1 -right-1 z-10"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (window.confirm(`Удалить сторис «${story.title}»?`)) {
                          void deleteAdminEntity("stories", story.id);
                        }
                      }}
                    />
                    <ActionIconButton
                      kind={story.isHidden ? "show" : "hide"}
                      label={story.isHidden ? "Показать участникам" : "Скрыть от участников"}
                      className="absolute -bottom-1 -left-1 z-10"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void setEntityVisibility("stories", story.id, !story.isHidden);
                      }}
                    />
                  </>
                )}
                <button
                  onClick={() => setActiveStoryIndex(index)}
                  className="flex flex-col items-center gap-1.5 w-[68px]"
                >
                  <div
                    className="w-[62px] h-[62px] rounded-full p-[2px]"
                    style={{
                      background: readStories.has(story.id)
                        ? "var(--line-subtle)"
                        : "linear-gradient(135deg, var(--accent-peach-warm), var(--accent-violet))",
                    }}
                  >
                    <img
                      src={story.image}
                      alt=""
                      className="w-full h-full rounded-full object-cover border-2 border-white"
                    />
                  </div>
                  <span
                    className="text-[11px] text-center leading-tight line-clamp-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {story.title}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pb-8 xl:grid xl:grid-cols-[minmax(0,1.7fr)_320px] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-4">
          {nextEvent && (
            <SurfaceCard className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                {nextEvent.status === "in_progress" ? (
                  <span
                    className="text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5"
                    style={{ background: "var(--success-soft)", color: "var(--success)", fontWeight: 600 }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "var(--success)" }}
                    />
                    Идёт сейчас
                  </span>
                ) : (
                  <span
                    className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", fontWeight: 600 }}
                  >
                    Следующее
                  </span>
                )}
              </div>

              {(() => {
                const { title: nextTitle, teacher: nextTeacher } = splitEventTitle(nextEvent.title);
                return (
                  <>
                    <h2
                      className="text-[22px] leading-tight mb-2"
                      style={{ color: "var(--text-primary)", fontWeight: 600 }}
                    >
                      {nextTitle}
                    </h2>
                    {nextTeacher && (
                      <p
                        className="text-[13.5px] mb-3"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {nextTeacher}
                      </p>
                    )}
                  </>
                );
              })()}

              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {nextEvent.startAt}–{nextEvent.endAt}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} /> {formatShortDate(nextEvent.date) ?? nextEvent.date}
                </span>
              </div>

              {(() => {
                const locationParts = [nextEvent.place, nextEvent.building, nextEvent.address]
                  .map((part) => part?.trim())
                  .filter((part): part is string => Boolean(part));
                const uniqueParts = [...new Set(locationParts)];
                if (uniqueParts.length === 0) return null;
                return (
                  <div
                    className="rounded-[var(--radius-md)] p-3.5 mb-4 flex items-start gap-2.5 text-[13.5px] leading-relaxed"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                  >
                    <MapPin size={15} className="shrink-0 mt-0.5" style={{ color: "var(--text-tertiary)" }} />
                    <div className="min-w-0">
                      <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>{uniqueParts[0]}</p>
                      {uniqueParts.slice(1).map((part, index) => (
                        <p key={index} className="mt-0.5">
                          {part}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openRoute(nextEvent.address, nextEvent.place)}
                  className="flex-1 min-w-[140px] py-2.5 rounded-[var(--radius-md)] text-[14px] flex items-center justify-center gap-2 transition-colors hover:bg-[var(--brand-hover)]"
                  style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 600 }}
                >
                  <Navigation size={15} /> Маршрут
                </button>
                <button
                  onClick={() => navigate("/profile/badge")}
                  className="px-5 py-2.5 rounded-[var(--radius-md)] text-[14px] flex items-center gap-2 border transition-colors hover:bg-[var(--bg-subtle)]"
                  style={{
                    borderColor: "var(--line-subtle)",
                    color: "var(--text-primary)",
                    background: "var(--bg-card)",
                    fontWeight: 500,
                  }}
                >
                  <CreditCard size={15} /> Бейдж
                </button>
              </div>
            </SurfaceCard>
          )}

          {upcomingAfterCurrent && (
            <button
              onClick={() => navigate(`/schedule?event=${upcomingAfterCurrent.id}`)}
              className="w-full text-left rounded-[var(--radius-md)] border px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
            >
              <span
                className="text-[10.5px] uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", fontWeight: 600 }}
              >
                Дальше
              </span>
              <span className="text-[13px] shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {upcomingAfterCurrent.startAt}
              </span>
              <span
                className="flex-1 min-w-0 truncate text-[14px]"
                style={{ color: "var(--text-primary)", fontWeight: 500 }}
              >
                {splitEventTitle(upcomingAfterCurrent.title).title}
              </span>
              <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
            </button>
          )}

          {nearestDeadline && (
            <button
              onClick={() => navigate("/documents")}
              className="w-full text-left rounded-[var(--radius-lg)] border p-4 flex items-center gap-3 transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
            >
              <div
                className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                style={
                  {
                    background: "color-mix(in srgb, var(--danger) 14%, transparent)",
                    color: "var(--danger)",
                  } as CSSProperties
                }
              >
                <FileText size={19} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {nearestDeadline.title}
                </p>
                <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {nearestDeadline.status === "blocked"
                    ? "Требует внимания"
                    : nearestDeadline.status === "in_progress"
                      ? "В процессе"
                      : "Не начато"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13.5px]" style={{ color: "var(--danger)", fontWeight: 600 }}>
                  {nearestDeadline.deadline}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  дедлайн
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
            </button>
          )}

          {todayEvents.length > 0 && (
            <SurfaceCard className="overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3">
                <p
                  className="text-[11px] uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                >
                  Расписание дня
                </p>
                <button
                  onClick={() => navigate("/schedule")}
                  className="text-[12.5px] flex items-center gap-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Все дни <ChevronRight size={13} />
                </button>
              </div>
              <div className="px-5 sm:px-6 pb-5">
                {todayEvents.map((event, index) => {
                  const isActive = event.status === "in_progress";
                  const isDone = event.status === "completed";
                  const isLast = index === todayEvents.length - 1;
                  const dotColor = isActive
                    ? "var(--success)"
                    : isDone
                      ? "var(--line-strong)"
                      : "var(--brand)";
                  const { title: rowTitle, teacher: rowTeacher } = splitEventTitle(event.title);
                  return (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/schedule?event=${event.id}`)}
                      className="w-full flex gap-3 text-left transition-colors rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
                    >
                      <div className="flex flex-col items-center w-[14px] shrink-0">
                        <div
                          className={`w-3 h-3 rounded-full border-2 mt-2 shrink-0 ${isActive ? "animate-pulse" : ""}`}
                          style={{
                            borderColor: dotColor,
                            backgroundColor: isActive ? "var(--success)" : "transparent",
                          }}
                        />
                        {!isLast && (
                          <div
                            className="w-[2px] flex-1 min-h-[28px]"
                            style={{ background: "var(--line-subtle)" }}
                          />
                        )}
                      </div>
                      <div
                        className={`flex-1 min-w-0 py-2 pr-2 ${isLast ? "" : "border-b"}`}
                        style={{ borderColor: "var(--line-subtle)" }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[12.5px]"
                            style={{ color: isDone ? "var(--text-tertiary)" : "var(--text-secondary)" }}
                          >
                            {event.startAt}–{event.endAt}
                          </span>
                          {isActive && (
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-full"
                              style={{
                                background: "var(--success-soft)",
                                color: "var(--success)",
                                fontWeight: 600,
                              }}
                            >
                              Сейчас
                            </span>
                          )}
                          {isDone && (
                            <Check size={12} style={{ color: "var(--text-tertiary)" }} />
                          )}
                          {currentUser.role === "participant" && event.countsForAttendance !== false && (() => {
                            const st = event.attendance === "confirmed"
                              ? { bg: "var(--success-soft)", color: "var(--success)", Icon: Check, tip: "Посещение отмечено" }
                              : event.status === "completed"
                                ? { bg: "var(--danger-soft)", color: "var(--danger)", Icon: X as LucideIcon, tip: "Занятие пропущено" }
                                : null;
                            if (!st) return null;
                            const Ico = st.Icon;
                            return (
                              <span
                                aria-label={st.tip}
                                title={st.tip}
                                className="inline-flex items-center justify-center rounded-full shrink-0"
                                style={{ width: 20, height: 20, background: st.bg, color: st.color }}
                              >
                                <Ico size={11} strokeWidth={2.4} />
                              </span>
                            );
                          })()}
                        </div>
                        <p
                          className="text-[14.5px] mt-0.5 leading-snug"
                          style={{
                            color: isDone ? "var(--text-tertiary)" : "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {rowTitle}
                        </p>
                        <div
                          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] mt-0.5"
                          style={{ color: isDone ? "var(--text-tertiary)" : "var(--text-secondary)" }}
                        >
                          {rowTeacher && <span>{rowTeacher}</span>}
                          {event.building && (
                            <>
                              {rowTeacher && <span aria-hidden="true">·</span>}
                              <span className="flex items-center gap-1">
                                <MapPin size={11} /> {event.building}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SurfaceCard>
          )}
        </div>

        <div className="hidden xl:flex xl:flex-col gap-4 mt-6 xl:mt-0">
          <SurfaceCard className="p-4 sm:p-5">
            <p
              className="text-[11px] uppercase tracking-wider mb-3"
              style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
            >
              Быстрые переходы
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.label}
                    onClick={link.onClick}
                    className="flex flex-col items-start gap-2 rounded-[var(--radius-md)] p-3 text-left border transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{
                      background: "var(--bg-card)",
                      borderColor: "var(--line-subtle)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center"
                      style={
                        {
                          background: `color-mix(in srgb, ${link.accent} 14%, transparent)`,
                          color: link.accent,
                        } as CSSProperties
                      }
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[13.5px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {link.label}
                      </p>
                      <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {link.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SurfaceCard>

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
                      onClick={openNotifications}
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
                    onClick={openNotifications}
                    className="w-full text-center px-4 py-3 text-[12.5px] border-t transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: "var(--line-subtle)", color: "var(--text-secondary)" }}
                  >
                    Все уведомления ({updates.length})
                  </button>
                )}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>

      {activeStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          startIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
          onMarkRead={(storyId) => void markStoryRead(storyId)}
        />
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--bg-app)" }}>
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--line-subtle)", background: "var(--bg-card)" }}
          >
            <button
              onClick={() => setShowNotifications(false)}
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
                  setAdminState({ kind: "orgUpdate", mode: "create" });
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
                        style={
                          {
                            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                            color: accent,
                          } as CSSProperties
                        }
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] leading-snug" style={{ color: "var(--text-primary)" }}>
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
                              setAdminState({ kind: "orgUpdate", mode: "edit", entity: update });
                            }}
                          />
                          <ActionIconButton
                            kind={update.isHidden ? "show" : "hide"}
                            label={update.isHidden ? "Показать участникам" : "Скрыть от участников"}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void setEntityVisibility("org-updates", update.id, !update.isHidden);
                            }}
                          />
                          <ActionIconButton
                            kind="delete"
                            label="Удалить уведомление"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (window.confirm("Удалить уведомление?")) {
                                void deleteAdminEntity("org-updates", update.id);
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
      )}

      <AdminEditorModal
        open={adminState !== null}
        kind={adminState?.kind ?? null}
        mode={adminState?.mode ?? "create"}
        entity={adminState?.entity}
        onClose={() => setAdminState(null)}
        onSubmit={async (payload) => {
          if (!adminState) return;
          const resource = ADMIN_PATHS[adminState.kind];
          if (adminState.mode === "create") {
            await createAdminEntity(resource, payload);
            return;
          }
          await updateAdminEntity(resource, (adminState.entity as { id: string }).id, payload);
        }}
      />
    </PageShell>
  );
}
