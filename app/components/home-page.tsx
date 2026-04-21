import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Info,
  MapPin,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { StoryViewer } from "./story-viewer";
import { PageShell, SectionHeader, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

function formatEventDate(value?: string | null) {
  if (!value) {
    return "Дата уточняется";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) {
    return "Дата уточняется";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, markStoryRead, markUpdatesRead, createAdminEntity, updateAdminEntity } = useAppData();
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
  } | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    const searchParams = new URLSearchParams(location.search);
    const adminAction = searchParams.get("admin");
    if (adminAction === "create-story" && data.currentUser.capabilities.canManageStories) {
      setAdminState({ kind: "story", mode: "create" });
      navigate("/", { replace: true });
    }
    if (adminAction === "create-update" && data.currentUser.capabilities.canManageUpdates) {
      setAdminState({ kind: "orgUpdate", mode: "create" });
      navigate("/", { replace: true });
    }
  }, [data, location.search, navigate]);

  if (!data) {
    return null;
  }

  const { camp, events, stories, orgUpdates: updates, documents, currentUser } = data;
  const nextEvent = events.find((event) => event.status === "in_progress") ?? events.find((event) => event.status === "upcoming");
  const todayEvents = events.filter((event) => event.day === data.ui.currentDay);
  const readStories = new Set(stories.filter((story) => story.read).map((story) => story.id));
  const unreadCount = updates.filter((update) => !update.isRead).length;
  const teacherOptions = (data.adminUsers.length > 0 ? data.adminUsers : data.people)
    .filter((person) => person.role === "teacher")
    .map((person) => ({ id: person.id, label: person.name }));
  const nearestDeadline = documents
    .filter((document) => document.status !== "done" && document.deadline)
    .sort((left, right) => (left.deadline! > right.deadline! ? 1 : -1))[0];
  const canEditNextEvent = Boolean(
    nextEvent
      && (
        currentUser.capabilities.canEditAllEvents
        || (currentUser.capabilities.canEditOwnEvents && nextEvent.teacherIds.includes(currentUser.id))
      ),
  );

  const openNotifications = () => {
    setShowNotifications(true);
    void markUpdatesRead(updates.filter((update) => !update.isRead).map((update) => update.id));
  };

  const openRoute = (eventAddress: string, fallbackPlace: string) => {
    const query = eventAddress || fallbackPlace;
    if (!query) {
      return;
    }
    openExternal(`https://yandex.ru/maps/?text=${encodeURIComponent(query)}`);
  };

  const desktopQuickLinks = [
    { label: "Расписание", icon: CalendarDays, onClick: () => navigate("/schedule") },
    { label: "Документы", icon: FileText, onClick: () => navigate("/documents") },
    { label: "Бейдж", icon: CreditCard, onClick: () => navigate("/profile/badge") },
    { label: "Уведомления", icon: Bell, onClick: openNotifications },
  ];

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            Яндекс Образование · День {data.ui.currentDay} из {data.ui.totalDays}
          </p>
          <button
            onClick={openNotifications}
            className="relative w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 -mr-1"
            style={{ color: "var(--text-secondary)" }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center"
                style={{ background: "var(--danger)", color: "white", fontWeight: 600 }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        <h1 className="text-[var(--text-primary)]">{camp.name}</h1>
      </div>

      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Сторис</p>
          {currentUser.capabilities.canManageStories && (
            <ActionIconButton
              kind="plus"
              label="Создать сторис"
              onClick={(event) => {
                event.preventDefault();
                setAdminState({ kind: "story", mode: "create" });
              }}
            />
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {stories.map((story, index) => (
            <div key={story.id} className="relative min-w-[68px]">
              {currentUser.capabilities.canManageStories && (
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
              )}
              <button
                onClick={() => setActiveStoryIndex(index)}
                className="flex flex-col items-center gap-1.5 min-w-[68px]"
              >
                <div
                  className="w-[62px] h-[62px] rounded-full p-[2px]"
                  style={{
                    background: readStories.has(story.id)
                      ? "var(--line-subtle)"
                      : "linear-gradient(135deg, var(--brand), var(--brand-hover))",
                  }}
                >
                  <img src={story.image} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" />
                </div>
                <span className="text-[11px] text-center leading-tight line-clamp-2 w-[68px]" style={{ color: "var(--text-secondary)" }}>
                  {story.title}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[minmax(0,1.65fr)_320px] xl:items-start xl:gap-6">
        <div className="min-w-0">
          {nextEvent && (
            <div className="px-5 pt-1">
              <SurfaceCard className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {nextEvent.status === "in_progress" ? (
                    <span
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)] flex items-center gap-1.5"
                      style={{ background: "var(--success-soft)", color: "var(--success)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
                      Идёт сейчас
                    </span>
                  ) : (
                    <span
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                    >
                      Следующее
                    </span>
                  )}
                  {canEditNextEvent && (
                    <ActionIconButton
                      kind="edit"
                      label={`Редактировать ${nextEvent.title}`}
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminState({ kind: "event", mode: "edit", entity: nextEvent });
                      }}
                    />
                  )}
                </div>
                <h2 className="text-[var(--text-primary)] mb-2">{nextEvent.title}</h2>
                <div className="flex items-center gap-4 text-[14px] mb-4 flex-wrap" style={{ color: "var(--text-secondary)" }}>
                  <span className="flex items-center gap-1.5">
                    <Clock size={15} /> {nextEvent.startAt}–{nextEvent.endAt}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={15} /> {formatEventDate(nextEvent.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} /> {nextEvent.place}
                  </span>
                </div>

                <div className="rounded-[var(--radius-md)] p-4 mb-4" style={{ background: "var(--bg-subtle)" }}>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-[12px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>Локация</p>
                      <p className="text-[16px]" style={{ color: "var(--text-primary)" }}>{nextEvent.building}</p>
                    </div>
                    {nextEvent.address && (
                      <div>
                        <p className="text-[12px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>Адрес</p>
                        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>{nextEvent.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => openRoute(nextEvent.address, nextEvent.place)}
                    className="flex-1 py-3 rounded-[var(--radius-md)] text-[15px] flex items-center justify-center gap-2"
                    style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 500 }}
                  >
                    <Navigation size={17} /> Маршрут
                  </button>
                  <button
                    onClick={() => navigate("/profile/badge")}
                    className="px-5 py-3 rounded-[var(--radius-md)] text-[15px] flex items-center gap-2"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                  >
                    <CreditCard size={17} /> Бейдж
                  </button>
                </div>
              </SurfaceCard>
            </div>
          )}

          {nearestDeadline && (
            <div className="px-5 mt-4">
              <SurfaceCard onClick={() => navigate("/documents")} className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                  style={{ background: "var(--danger-soft)" }}
                >
                  <FileText size={18} style={{ color: "var(--danger)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>{nearestDeadline.title}</p>
                  <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                    {nearestDeadline.status === "blocked" ? "Требует внимания" : nearestDeadline.status === "in_progress" ? "В процессе" : "Не начато"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px]" style={{ color: "var(--danger)", fontWeight: 500 }}>{nearestDeadline.deadline}</p>
                  <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>дедлайн</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
              </SurfaceCard>
            </div>
          )}

          {todayEvents.length > 0 && (
            <div className="px-5 pb-6 mt-5">
              <SectionHeader
                title="Расписание дня"
                right={(
                  <div className="flex items-center gap-2">
                    {currentUser.capabilities.canCreateEvents && (
                      <ActionIconButton
                        kind="plus"
                        label="Создать занятие"
                        onClick={(event) => {
                          event.preventDefault();
                          setAdminState({ kind: "event", mode: "create" });
                        }}
                      />
                    )}
                    <button onClick={() => navigate("/schedule")} className="text-[13px] flex items-center gap-0.5" style={{ color: "var(--text-secondary)" }}>
                      Все дни <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              />
              <div className="space-y-0">
                {todayEvents.map((event, index) => {
                  const isActive = event.status === "in_progress";
                  const isDone = event.status === "completed";
                  const isLast = index === todayEvents.length - 1;
                  return (
                    <button key={event.id} onClick={() => navigate("/schedule")} className="w-full flex gap-3 text-left">
                      <div className="flex flex-col items-center min-w-[20px]">
                        <div
                          className={`w-3 h-3 rounded-full border-2 mt-1.5 shrink-0 ${isActive ? "animate-pulse" : ""}`}
                          style={{
                            borderColor: isDone ? "var(--line-strong)" : isActive ? "var(--success)" : "var(--brand)",
                            backgroundColor: isActive ? "var(--success)" : "transparent",
                          }}
                        />
                        {!isLast && <div className="w-[2px] flex-1 min-h-[28px]" style={{ background: "var(--line-subtle)" }} />}
                      </div>
                      <div className={`pb-3 flex-1 ${isLast ? "" : "border-b"}`} style={{ borderColor: "var(--line-subtle)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px]" style={{ color: isDone ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
                            {event.startAt}–{event.endAt}
                          </span>
                          {isActive && (
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)]"
                              style={{ background: "var(--success-soft)", color: "var(--success)" }}
                            >
                              Сейчас
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] mt-0.5" style={{ color: isDone ? "var(--text-tertiary)" : "var(--text-primary)" }}>
                          {event.title}
                        </p>
                        <span className="text-[13px] flex items-center gap-1 mt-0.5" style={{ color: isDone ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
                          <MapPin size={12} /> {event.place}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="hidden xl:flex xl:flex-col gap-4 px-5 pb-6 xl:px-0 xl:pr-5">
          <SurfaceCard className="p-5">
            <SectionHeader title="Сводка дня" />
            <p className="text-[13px] mb-4" style={{ color: "var(--text-secondary)" }}>
              {camp.shortDesc}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "День", value: `${data.ui.currentDay}/${data.ui.totalDays}` },
                { label: "Событий", value: String(todayEvents.length) },
                { label: "Новости", value: String(unreadCount) },
                { label: "Дедлайн", value: nearestDeadline?.deadline ?? "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-[var(--radius-md)] p-3" style={{ background: "var(--bg-subtle)" }}>
                  <p className="text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
                  <p className="text-[18px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader title="Быстрые переходы" />
            <div className="grid grid-cols-2 gap-2">
              {desktopQuickLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-3 text-left"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                >
                  <item.icon size={16} />
                  <span className="text-[13px]">{item.label}</span>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader title="Последние обновления" />
            {updates.length === 0 ? (
              <p className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
                Новых обновлений пока нет.
              </p>
            ) : (
              <div className="space-y-3">
                {updates.slice(0, 3).map((update) => (
                  <div key={update.id} className="rounded-[var(--radius-md)] p-3" style={{ background: "var(--bg-subtle)" }}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-[13px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {update.type === "urgent" ? "Срочно" : update.type === "change" ? "Изменение" : "Инфо"}
                      </p>
                      <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{update.time}</span>
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{update.text}</p>
                  </div>
                ))}
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
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--bg-page)" }}>
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--line-subtle)", background: "var(--bg-card)" }}
          >
            <button
              onClick={() => setShowNotifications(false)}
              className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)]"
              style={{ color: "var(--text-primary)" }}
            >
              <ArrowLeft size={22} />
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
              <span className="text-[13px] px-2.5 py-0.5 rounded-[var(--radius-sm)]" style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}>
                {updates.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
                <Bell size={40} style={{ color: "var(--line-strong)" }} />
                <p className="text-[16px] text-center" style={{ color: "var(--text-tertiary)" }}>Нет новых уведомлений</p>
              </div>
            ) : (
              <div className="max-w-lg mx-auto px-4 py-3 space-y-2.5">
                {updates.map((update) => {
                  const icon = update.type === "urgent"
                    ? <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
                    : update.type === "change"
                      ? <RefreshCw size={16} style={{ color: "var(--warning)" }} />
                      : <Info size={16} style={{ color: "var(--info)" }} />;
                  const bgColor = update.type === "urgent"
                    ? "var(--danger-soft)"
                    : update.type === "change"
                      ? "rgba(255, 170, 0, 0.08)"
                      : "rgba(0, 122, 255, 0.06)";

                  return (
                    <div
                      key={update.id}
                      className="rounded-[var(--radius-md)] p-4 flex items-start gap-3"
                      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-card)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                        style={{ background: bgColor }}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] leading-snug" style={{ color: "var(--text-primary)" }}>{update.text}</p>
                        <p className="text-[12px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>{update.time}</p>
                      </div>
                      {currentUser.capabilities.canManageUpdates && (
                        <ActionIconButton
                          kind="edit"
                          label="Редактировать уведомление"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setAdminState({ kind: "orgUpdate", mode: "edit", entity: update });
                          }}
                        />
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
        teacherOptions={teacherOptions}
        allowTeacherAssignment={currentUser.capabilities.canAssignTeachers}
        onClose={() => setAdminState(null)}
        onSubmit={async (payload) => {
          if (!adminState) {
            return;
          }
          const normalizedPayload = adminState.kind === "event" && !currentUser.capabilities.canAssignTeachers
            ? { ...(payload as Record<string, unknown>), teacherIds: [] }
            : payload;
          const resource = ADMIN_PATHS[adminState.kind];
          if (adminState.mode === "create") {
            await createAdminEntity(resource, normalizedPayload);
            return;
          }
          await updateAdminEntity(resource, (adminState.entity as { id: string }).id, normalizedPayload);
        }}
      />
    </PageShell>
  );
}
