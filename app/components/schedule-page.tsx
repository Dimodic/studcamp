import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  Download,
  ExternalLink,
  File,
  FileText,
  FolderOpen,
  Laptop,
  Link2,
  MapPin,
  Navigation,
  Video,
  X as XIcon,
  type LucideIcon,
} from "lucide-react";
import { PageShell, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";
import type { Event } from "../lib/domain";
import { splitEventTitle } from "../lib/events";
import { AttendanceUploader } from "./schedule/AttendanceUploader";
import { ClipboardCheck } from "lucide-react";
import { MATERIAL_TYPE_LABELS } from "../lib/options";

const MATERIAL_TYPE_ACCENT: Record<string, string> = {
  presentation: "var(--accent-blue)",
  recording: "var(--accent-pink)",
  guide: "var(--accent-violet)",
  checklist: "var(--accent-teal)",
  org_doc: "var(--text-secondary)",
};

const ATTACHMENT_ICONS: Record<string, LucideIcon> = {
  presentation: FileText,
  recording: Video,
  guide: BookOpen,
  checklist: CheckSquare,
  org_doc: File,
};

const RESOURCE_KIND_LABELS: Record<string, string> = {
  doc: "Документ",
  sheet: "Таблица",
  form: "Форма",
  folder: "Папка",
  calendar: "Календарь",
  gallery: "Галерея",
  map: "Карта",
  repo: "Репозиторий",
  guide: "Гайд",
};

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatDayHeader(value?: string | null): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return "Дата уточняется";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(parsed)
    .toUpperCase();
}

interface DateParts {
  dayNumber: string;
  weekday: string;
  month: string;
}

function extractDateParts(value?: string | null): DateParts {
  const parsed = parseDate(value);
  if (!parsed) {
    return { dayNumber: "—", weekday: "", month: "" };
  }
  const dayNumber = new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(parsed);
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(parsed);
  const month = new Intl.DateTimeFormat("ru-RU", { month: "short" })
    .format(parsed)
    .replace(/\.$/, "");
  return {
    dayNumber,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    month,
  };
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Маленький самостоятельный бейдж с иконкой посещаемости. Рендерится как
 * 22-пиксельный кружок у правого края карточки — не зависит от layout
 * преподавателя и сразу читается как «статус посещения». */
function AttendanceBadge({
  attendance,
  eventStatus,
  isParticipant,
  counts,
}: {
  attendance?: "confirmed" | "pending" | "not_checked" | null;
  eventStatus: string;
  isParticipant: boolean;
  counts: boolean;
}) {
  if (!isParticipant || !counts) return null;
  let bg = "";
  let color = "";
  let Icon: LucideIcon | null = null;
  let tooltip = "";
  if (attendance === "confirmed") {
    bg = "var(--success-soft)";
    color = "var(--success)";
    Icon = Check;
    tooltip = "Посещение отмечено";
  } else if (attendance === "pending") {
    bg = "var(--warning-soft)";
    color = "var(--warning)";
    Icon = Clock;
    tooltip = "Посещение проверяется";
  } else if (eventStatus === "completed") {
    bg = "var(--danger-soft)";
    color = "var(--danger)";
    Icon = XIcon;
    tooltip = "Занятие пропущено";
  }
  if (!Icon) return null;
  return (
    <span
      aria-label={tooltip}
      title={tooltip}
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: 22, height: 22, background: bg, color }}
    >
      <Icon size={12} strokeWidth={2.4} />
    </span>
  );
}

interface EventGroup {
  day: number;
  date: string;
  theme: string | null;
  events: Event[];
}

function extractDayTheme(events: Event[]): string | null {
  if (events.length === 0) return null;
  const first = (events[0].description ?? "").trim();
  if (!first || first.length > 60) return null;
  const allSame = events.every((event) => (event.description ?? "").trim() === first);
  return allSame ? first : null;
}

function groupEventsByDay(events: Event[]): EventGroup[] {
  const groups = new Map<number, { day: number; date: string; events: Event[] }>();
  for (const event of events) {
    const existing = groups.get(event.day);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(event.day, { day: event.day, date: event.date, events: [event] });
    }
  }
  return [...groups.values()]
    .sort((left, right) => left.day - right.day)
    .map((group) => ({ ...group, theme: extractDayTheme(group.events) }));
}

export function SchedulePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data,
    checkInEvent,
    createAdminEntity,
    updateAdminEntity,
    deleteAdminEntity,
    setEntityVisibility,
  } = useAppData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [attendanceEventId, setAttendanceEventId] = useState<string | null>(null);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);
  const dayRefs = useRef(new Map<number, HTMLElement>());
  const didInitialScroll = useRef(false);

  const groups = useMemo(() => (data ? groupEventsByDay(data.events) : []), [data]);

  useEffect(() => {
    if (!data) {
      return;
    }
    const searchParams = new URLSearchParams(location.search);
    const eventId = searchParams.get("event");
    const adminAction = searchParams.get("admin");

    if (eventId) {
      const target = data.events.find((event) => event.id === eventId);
      if (target) {
        setExpanded(target.id);
        const node = dayRefs.current.get(target.day);
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      navigate("/schedule", { replace: true });
      return;
    }

    if (adminAction === "create-event" && data.currentUser.capabilities.canCreateEvents) {
      setAdminState({ kind: "event", mode: "create" });
      navigate("/schedule", { replace: true });
    }
  }, [data, location.search, navigate]);

  useEffect(() => {
    if (!data || didInitialScroll.current || groups.length === 0) {
      return;
    }

    const today = data.ui.currentDay;
    const target = groups.find((group) => group.day === today) ?? groups[0];

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trySnap = () => {
      const node = dayRefs.current.get(target.day);
      if (node) {
        node.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
        didInitialScroll.current = true;
        return;
      }
      attempts += 1;
      if (attempts < 12) {
        timer = setTimeout(trySnap, 30);
      }
    };

    // Через setTimeout(0), чтобы сначала отработал сброс main.scrollTop=0
    // из Layout (родительские effects выполняются ПОСЛЕ дочерних).
    timer = setTimeout(trySnap, 0);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [data, groups]);

  if (!data) {
    return null;
  }

  const { materials, resources, currentUser, ui } = data;
  const teacherOptions = (data.adminUsers.length > 0 ? data.adminUsers : data.people)
    .filter((person) => person.role === "teacher")
    .map((person) => ({ id: person.id, label: person.name }));
  const manageableEventOptions = (currentUser.capabilities.canEditAllEvents
    ? data.events
    : data.events.filter((event) => event.teacherIds.includes(currentUser.id))
  ).map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));

  return (
    <div className="min-h-full" style={{ background: "var(--bg-card)" }}>
      <PageShell size="wide">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[var(--text-primary)]">Расписание</h1>
              <p className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                <CalendarDays size={14} /> День {ui.currentDay} из {ui.totalDays}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentUser.capabilities.canManageAll && (
                <button
                  type="button"
                  onClick={() => setAttendanceEventId(data.events[0]?.id ?? "")}
                  aria-label="Отметить посещаемость"
                  title="Отметить посещаемость по фото"
                  className="h-9 px-3 text-[13px] rounded-[var(--radius-md)] border flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-subtle)]"
                  style={{ borderColor: "var(--line-subtle)", color: "var(--text-secondary)" }}
                >
                  <ClipboardCheck size={15} /> Листок
                </button>
              )}
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
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 xl:grid xl:grid-cols-[minmax(0,1.7fr)_320px] xl:gap-6 xl:items-start">
          <div className="min-w-0">
            {groups.length === 0 ? (
              <SurfaceCard className="p-6">
                <p className="text-[15px]" style={{ color: "var(--text-tertiary)" }}>
                  Пока нет запланированных событий.
                </p>
              </SurfaceCard>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <section
                    key={group.day}
                    ref={(node) => {
                      if (node) {
                        dayRefs.current.set(group.day, node);
                      } else {
                        dayRefs.current.delete(group.day);
                      }
                    }}
                  >
                    <div
                      className="sticky top-0 z-10 py-3"
                      style={{ background: "var(--bg-card)" }}
                    >
                      <div className="flex items-center gap-3">
                        <p
                          className="text-[12px] tracking-wide"
                          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                        >
                          {formatDayHeader(group.date)}
                        </p>
                        <span
                          className="text-[12px] px-2 py-0.5 rounded-[var(--radius-sm)]"
                          style={{
                            background: group.day === ui.currentDay ? "var(--brand-soft)" : "var(--bg-subtle)",
                            color: group.day === ui.currentDay ? "var(--text-primary)" : "var(--text-secondary)",
                            fontWeight: group.day === ui.currentDay ? 600 : 400,
                          }}
                        >
                          День {group.day}
                        </span>
                        <div className="flex-1 h-px" style={{ background: "var(--line-subtle)" }} />
                      </div>
                      {(() => {
                        const dayTitle = data.camp.dayTitles?.[String(group.day)];
                        const label = dayTitle ?? group.theme;
                        if (!label) return null;
                        return (
                          <p
                            className="text-[15px] mt-1.5"
                            style={{ color: "var(--text-primary)", fontWeight: 600 }}
                          >
                            {label}
                          </p>
                        );
                      })()}
                    </div>

                    <div className="relative">
                      <div
                        className="absolute left-[25px] top-0 bottom-0 w-[2px]"
                        style={{ background: "var(--line-subtle)" }}
                      />
                      <div className="space-y-3">
                        {group.events.map((event) => {
                          const isExpanded = expanded === event.id;
                          const hasLaptop = (event.materials ?? []).some((item) =>
                            item.toLowerCase().includes("ноутбук"),
                          );
                          const isChecked = event.attendance === "confirmed";
                          const eventMaterials = materials.filter((material) => material.eventId === event.id);
                          const eventResources = resources.filter((resource) => resource.eventId === event.id);
                          const canEditEvent =
                            currentUser.capabilities.canEditAllEvents ||
                            (currentUser.capabilities.canEditOwnEvents && event.teacherIds.includes(currentUser.id));
                          const dotColor =
                            event.status === "in_progress"
                              ? "var(--success)"
                              : event.status === "completed"
                                ? "var(--line-strong)"
                                : event.status === "changed"
                                  ? "var(--warning)"
                                  : event.status === "cancelled"
                                    ? "var(--danger)"
                                    : "var(--brand)";

                          const { title: displayTitle, teacher } = splitEventTitle(event.title);

                          return (
                            <div key={event.id} className="relative pl-[52px]">
                              <div
                                className={`absolute left-[20px] top-4 w-[12px] h-[12px] rounded-full ${event.status === "in_progress" ? "animate-pulse" : ""}`}
                                style={{ backgroundColor: dotColor, border: "2px solid var(--bg-card)" }}
                              />
                              <SurfaceCard
                                onClick={() => setExpanded(isExpanded ? null : event.id)}
                                className={`p-4 ${event.status === "cancelled" || event.isHidden ? "opacity-50" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                                      {event.startAt}–{event.endAt}
                                    </span>
                                    <AttendanceBadge
                                      attendance={event.attendance}
                                      eventStatus={event.status}
                                      isParticipant={currentUser.role === "participant"}
                                      counts={event.countsForAttendance !== false}
                                    />
                                    {hasLaptop && (
                                      <span
                                        className="flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-[var(--radius-sm)]"
                                        style={{ background: "var(--info-soft)", color: "var(--info)" }}
                                      >
                                        <Laptop size={12} /> Ноутбук
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap justify-end">
                                    {teacher && (
                                      event.teacherIds[0] ? (
                                        <button
                                          type="button"
                                          onClick={(clickEvent) => {
                                            clickEvent.stopPropagation();
                                            navigate(`/people?user=${event.teacherIds[0]}`);
                                          }}
                                          className="text-[12px] px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--line-subtle)]"
                                          style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", fontWeight: 500 }}
                                        >
                                          {teacher}
                                        </button>
                                      ) : (
                                        <span
                                          className="text-[12px] px-2.5 py-1 rounded-full"
                                          style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", fontWeight: 500 }}
                                        >
                                          {teacher}
                                        </span>
                                      )
                                    )}
                                    {event.status === "in_progress" && (
                                      <span
                                        className="text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5"
                                        style={{ background: "var(--success-soft)", color: "var(--success)", fontWeight: 600 }}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
                                        Идёт сейчас
                                      </span>
                                    )}
                                    {event.status === "changed" && (
                                      <span
                                        className="text-[12px] px-2.5 py-1 rounded-full"
                                        style={{ background: "var(--warning-soft)", color: "var(--warning)", fontWeight: 600 }}
                                      >
                                        Изменено
                                      </span>
                                    )}
                                    {event.status === "cancelled" && (
                                      <span
                                        className="text-[12px] px-2.5 py-1 rounded-full"
                                        style={{ background: "var(--danger-soft)", color: "var(--danger)", fontWeight: 600 }}
                                      >
                                        Отменено
                                      </span>
                                    )}
                                    {canEditEvent && (
                                      <>
                                        <ActionIconButton
                                          kind="edit"
                                          label={`Редактировать ${event.title}`}
                                          onClick={(clickEvent) => {
                                            clickEvent.preventDefault();
                                            clickEvent.stopPropagation();
                                            setAdminState({ kind: "event", mode: "edit", entity: event });
                                          }}
                                        />
                                        {currentUser.capabilities.canManageAll && (
                                          <ActionIconButton
                                            kind={event.isHidden ? "show" : "hide"}
                                            label={event.isHidden ? "Показать участникам" : "Скрыть от участников"}
                                            onClick={(clickEvent) => {
                                              clickEvent.preventDefault();
                                              clickEvent.stopPropagation();
                                              void setEntityVisibility("events", event.id, !event.isHidden);
                                            }}
                                          />
                                        )}
                                        <ActionIconButton
                                          kind="delete"
                                          label={`Удалить ${event.title}`}
                                          onClick={(clickEvent) => {
                                            clickEvent.preventDefault();
                                            clickEvent.stopPropagation();
                                            if (window.confirm(`Удалить занятие «${event.title}»?`)) {
                                              void deleteAdminEntity("events", event.id);
                                            }
                                          }}
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>

                                <h3
                                  className={`text-[16px] mb-1 ${event.status === "cancelled" ? "line-through" : ""}`}
                                  style={{
                                    color:
                                      event.status === "cancelled" ? "var(--text-tertiary)" : "var(--text-primary)",
                                    fontWeight: 500,
                                  }}
                                >
                                  {displayTitle}
                                </h3>
                                <p
                                  className="text-[13px] flex items-center gap-1.5"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  <MapPin size={13} /> {event.place}
                                </p>

                                {eventMaterials.length > 0 && (
                                  <button
                                    onClick={(evt) => {
                                      evt.stopPropagation();
                                      navigate(`/materials?event=${event.id}`);
                                    }}
                                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]"
                                    style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                                  >
                                    <FolderOpen size={12} />
                                    Материалы ({eventMaterials.length})
                                  </button>
                                )}

                                {isExpanded && (() => {
                                  const attachments = [
                                    ...eventMaterials.map((item) => ({ kind: "material" as const, item })),
                                    ...eventResources.map((item) => ({ kind: "resource" as const, item })),
                                  ];
                                  const routeQuery = event.address || event.building || event.place;
                                  const routeLabel =
                                    event.address || event.building || event.place || "Открыть в картах";
                                  const trimmedDescription = (event.description ?? "").trim();
                                  const showDescription =
                                    Boolean(trimmedDescription) && trimmedDescription !== group.theme;

                                  return (
                                    <div
                                      className="mt-3 pt-3 border-t"
                                      style={{ borderColor: "var(--line-subtle)" }}
                                      onClick={(evt) => evt.stopPropagation()}
                                    >
                                      {showDescription && (
                                        <p className="text-[14px] mb-3" style={{ color: "var(--text-secondary)" }}>
                                          {trimmedDescription}
                                        </p>
                                      )}

                                      {hasLaptop && (
                                        <div
                                          className="rounded-[var(--radius-md)] p-3 mb-3 flex items-center gap-2.5"
                                          style={{ background: "var(--info-soft)" }}
                                        >
                                          <Laptop size={15} style={{ color: "var(--info)" }} />
                                          <p className="text-[13px]" style={{ color: "var(--info)" }}>
                                            Возьмите ноутбук с зарядкой
                                          </p>
                                        </div>
                                      )}

                                      {event.materials && event.materials.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                          {event.materials.map((material) => (
                                            <span
                                              key={material}
                                              className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]"
                                              style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                                            >
                                              {material}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {attachments.length > 0 && (
                                        <div className="mb-3 space-y-2">
                                          {attachments.map(({ kind, item }) => {
                                            const isMaterial = kind === "material";
                                            const accent = isMaterial
                                              ? MATERIAL_TYPE_ACCENT[item.type] ?? "var(--text-secondary)"
                                              : "var(--info)";
                                            const TypeIcon = isMaterial
                                              ? (ATTACHMENT_ICONS[item.type] ?? File)
                                              : Link2;
                                            const metaText = isMaterial
                                              ? [
                                                  MATERIAL_TYPE_LABELS[item.type] ?? item.type,
                                                  item.fileSize,
                                                ]
                                                  .filter(Boolean)
                                                  .join(" · ")
                                              : RESOURCE_KIND_LABELS[item.kind] ?? item.kind;

                                            return (
                                              <div
                                                key={`${kind}-${item.id}`}
                                                className="flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] border transition-colors hover:bg-[var(--bg-subtle)]"
                                                style={{
                                                  background: "var(--bg-card)",
                                                  borderColor: "var(--line-subtle)",
                                                }}
                                              >
                                                <div
                                                  className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                                                  style={
                                                    {
                                                      background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                                                      color: accent,
                                                    } as CSSProperties
                                                  }
                                                >
                                                  <TypeIcon size={16} />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => openExternal(item.url)}
                                                  className="flex-1 min-w-0 text-left"
                                                >
                                                  <p
                                                    className="text-[13.5px] leading-snug truncate"
                                                    style={{ color: "var(--text-primary)", fontWeight: 500 }}
                                                  >
                                                    {item.title}
                                                  </p>
                                                  <p
                                                    className="text-[11.5px] mt-0.5 truncate"
                                                    style={{ color: "var(--text-tertiary)" }}
                                                  >
                                                    {metaText}
                                                  </p>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => openExternal(item.url)}
                                                  aria-label={isMaterial ? "Скачать" : "Открыть ссылку"}
                                                  className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors hover:bg-[var(--bg-card)] shrink-0"
                                                  style={{ color: "var(--info)" }}
                                                >
                                                  {isMaterial ? <Download size={15} /> : <ExternalLink size={15} />}
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {routeQuery && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openExternal(
                                              `https://yandex.ru/maps/?text=${encodeURIComponent(routeQuery)}`,
                                            )
                                          }
                                          className="w-full flex items-center gap-2 py-1 mb-2 text-left transition-colors hover:underline"
                                        >
                                          <Navigation
                                            size={14}
                                            style={{ color: "var(--text-tertiary)" }}
                                            className="shrink-0"
                                          />
                                          <span
                                            className="text-[14px] truncate flex-1"
                                            style={{ color: "var(--text-primary)" }}
                                          >
                                            {routeLabel}
                                          </span>
                                          <ExternalLink
                                            size={13}
                                            style={{ color: "var(--text-tertiary)" }}
                                            className="shrink-0"
                                          />
                                        </button>
                                      )}

                                      {event.status === "in_progress" && (
                                        <div className="flex justify-end">
                                          <button
                                            type="button"
                                            onClick={() => void checkInEvent(event.id)}
                                            className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-[var(--radius-md)]"
                                            style={{
                                              background: isChecked ? "var(--success-soft)" : "var(--text-primary)",
                                              color: isChecked ? "var(--success)" : "var(--text-inverted)",
                                              fontWeight: 500,
                                            }}
                                          >
                                            {isChecked ? (
                                              <>
                                                <Check size={13} /> Отмечено
                                              </>
                                            ) : (
                                              "Я здесь"
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </SurfaceCard>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="hidden xl:flex xl:flex-col gap-4 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
            <SurfaceCard className="p-4">
              <div className="flex items-baseline justify-between mb-3 px-1">
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                  Дни кемпа
                </p>
                <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  {ui.currentDay} / {ui.totalDays}
                </p>
              </div>
              <div className="flex flex-col">
                {groups.map((group) => {
                  const parts = extractDateParts(group.date);
                  const isActive = group.day === ui.currentDay;
                  return (
                    <button
                      key={group.day}
                      onClick={() => {
                        const node = dayRefs.current.get(group.day);
                        node?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="group flex items-center gap-3 px-2 py-2 rounded-[var(--radius-md)] text-left transition-colors hover:bg-[var(--bg-subtle)]"
                    >
                      <div
                        className="w-10 h-10 rounded-[var(--radius-md)] flex flex-col items-center justify-center shrink-0 leading-none"
                        style={{
                          background: isActive ? "var(--accent-peach)" : "var(--bg-subtle)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <span className="text-[15px]" style={{ fontWeight: 600 }}>
                          {parts.dayNumber}
                        </span>
                        <span
                          className="text-[9px] uppercase tracking-wider mt-0.5"
                          style={{
                            color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                            opacity: isActive ? 0.65 : 1,
                          }}
                        >
                          {parts.month}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[14px] truncate"
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: isActive ? 600 : 500,
                          }}
                        >
                          {parts.weekday}
                        </p>
                        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                          День {group.day}
                        </p>
                      </div>
                      <span
                        className="text-[12px] px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: isActive ? "var(--brand-soft)" : "var(--bg-subtle)",
                          color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {group.events.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SurfaceCard>
          </div>
        </div>

        <AttendanceUploader
          events={data.events}
          open={attendanceEventId !== null}
          defaultEventId={attendanceEventId ?? undefined}
          onClose={() => setAttendanceEventId(null)}
        />

        <AdminEditorModal
          open={adminState !== null}
          kind={adminState?.kind ?? null}
          mode={adminState?.mode ?? "create"}
          entity={adminState?.entity}
          defaults={adminState?.defaults}
          eventOptions={manageableEventOptions}
          teacherOptions={teacherOptions}
          allowTeacherAssignment={currentUser.capabilities.canAssignTeachers}
          onClose={() => setAdminState(null)}
          onSubmit={async (payload) => {
            if (!adminState) {
              return;
            }
            const normalizedPayload =
              adminState.kind === "event" && !currentUser.capabilities.canAssignTeachers
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
    </div>
  );
}
