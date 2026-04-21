import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderOpen,
  Laptop,
  Link2,
  MapPin,
  Navigation,
} from "lucide-react";
import { PageShell, StatusBadge, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

function formatDate(value?: string | null) {
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

function AttendanceBadge({ attendance }: { attendance?: "confirmed" | "pending" | "not_checked" | null }) {
  if (!attendance || attendance === "not_checked") {
    return null;
  }

  if (attendance === "confirmed") {
    return (
      <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--success)" }}>
        <CheckCircle2 size={13} /> Отмечено
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--warning)" }}>
      <AlertTriangle size={13} /> Проверяется
    </span>
  );
}

export function SchedulePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, checkInEvent, createAdminEntity, updateAdminEntity } = useAppData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);
  const days = useMemo(
    () => (data ? [...new Set(data.events.map((event) => event.day))].sort((left, right) => left - right) : []),
    [data],
  );

  useEffect(() => {
    if (!data || days.length === 0) {
      return;
    }
    const preferredDay = days.includes(data.ui.currentDay) ? data.ui.currentDay : days[0];
    setActiveDay(preferredDay);
  }, [data, days]);

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
        setActiveDay(target.day);
        setExpanded(target.id);
      }
      navigate("/schedule", { replace: true });
      return;
    }

    if (adminAction === "create-event" && data.currentUser.capabilities.canCreateEvents) {
      setAdminState({ kind: "event", mode: "create" });
      navigate("/schedule", { replace: true });
    }
  }, [data, location.search, navigate]);

  if (!data) {
    return null;
  }

  const { events, materials, resources, currentUser } = data;
  const teacherOptions = (data.adminUsers.length > 0 ? data.adminUsers : data.people)
    .filter((person) => person.role === "teacher")
    .map((person) => ({ id: person.id, label: person.name }));
  const manageableEventOptions = (currentUser.capabilities.canEditAllEvents ? events : events.filter((event) => event.teacherIds.includes(currentUser.id)))
    .map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));

  const dayEvents = events.filter((event) => event.day === activeDay);
  const dayDate = dayEvents[0]?.date;
  const selectedEvent = dayEvents.find((event) => event.id === expanded)
    ?? dayEvents.find((event) => event.status === "in_progress")
    ?? dayEvents[0]
    ?? null;
  const selectedEventMaterials = selectedEvent ? materials.filter((material) => material.eventId === selectedEvent.id) : [];
  const selectedEventResources = selectedEvent ? resources.filter((resource) => resource.eventId === selectedEvent.id) : [];
  const inProgressCount = dayEvents.filter((event) => event.status === "in_progress").length;
  const completedCount = dayEvents.filter((event) => event.status === "completed").length;

  return (
    <div className="min-h-full" style={{ background: "var(--bg-card)" }}>
      <PageShell size="wide">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[var(--text-primary)]">Расписание</h1>
              {dayDate && (
                <p className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                  <CalendarDays size={14} /> {formatDate(dayDate)}
                </p>
              )}
            </div>
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

        <div className="px-5 pb-8 xl:grid xl:grid-cols-[minmax(0,1.7fr)_320px] xl:gap-6">
          <div className="min-w-0">
            <div className="pb-4 flex gap-2 overflow-x-auto">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] text-[14px] whitespace-nowrap transition-colors"
                  style={{
                    background: activeDay === day ? "var(--text-primary)" : "var(--bg-card)",
                    color: activeDay === day ? "var(--text-inverted)" : "var(--text-secondary)",
                    border: activeDay === day ? "none" : "1px solid var(--line-subtle)",
                    fontWeight: activeDay === day ? 500 : 400,
                  }}
                >
                  День {day}
                </button>
              ))}
            </div>

            {dayEvents.length === 0 ? (
              <SurfaceCard className="p-6">
                <p className="text-[15px]" style={{ color: "var(--text-tertiary)" }}>
                  Для этого дня пока нет событий.
                </p>
              </SurfaceCard>
            ) : (
              <div className="relative">
                <div className="absolute left-[25px] top-0 bottom-0 w-[2px]" style={{ background: "var(--line-subtle)" }} />
                <div className="space-y-3">
                  {dayEvents.map((event) => {
                    const isExpanded = expanded === event.id;
                    const hasLaptop = (event.materials ?? []).some((item) => item.toLowerCase().includes("ноутбук"));
                    const isChecked = event.attendance === "confirmed";
                    const eventMaterials = materials.filter((material) => material.eventId === event.id);
                    const eventResources = resources.filter((resource) => resource.eventId === event.id);
                    const canEditEvent = currentUser.capabilities.canEditAllEvents
                      || (currentUser.capabilities.canEditOwnEvents && event.teacherIds.includes(currentUser.id));
                    const canManageEventAssets = currentUser.capabilities.canManageAll
                      || (currentUser.capabilities.canEditOwnEvents && event.teacherIds.includes(currentUser.id));
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

                    return (
                      <div key={event.id} className="relative pl-[52px]">
                        <div
                          className={`absolute left-[20px] top-4 w-[12px] h-[12px] rounded-full z-10 ${event.status === "in_progress" ? "animate-pulse" : ""}`}
                          style={{ backgroundColor: dotColor, border: "2px solid var(--bg-card)" }}
                        />
                        <SurfaceCard
                          onClick={() => setExpanded(isExpanded ? null : event.id)}
                          className={`p-4 ${event.status === "cancelled" ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                                {event.startAt}–{event.endAt}
                              </span>
                              {hasLaptop && (
                                <span className="flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-[var(--radius-sm)]" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                                  <Laptop size={12} /> Ноутбук
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <AttendanceBadge attendance={event.attendance} />
                              <StatusBadge status={event.status} />
                              {canEditEvent && (
                                <ActionIconButton
                                  kind="edit"
                                  label={`Редактировать ${event.title}`}
                                  onClick={(clickEvent) => {
                                    clickEvent.preventDefault();
                                    clickEvent.stopPropagation();
                                    setAdminState({ kind: "event", mode: "edit", entity: event });
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          <h3
                            className={`text-[16px] mb-1 ${event.status === "cancelled" ? "line-through" : ""}`}
                            style={{ color: event.status === "cancelled" ? "var(--text-tertiary)" : "var(--text-primary)", fontWeight: 500 }}
                          >
                            {event.title}
                          </h3>
                          <p className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
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

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--line-subtle)" }} onClick={(evt) => evt.stopPropagation()}>
                              {event.description && (
                                <p className="text-[14px] mb-3" style={{ color: "var(--text-secondary)" }}>{event.description}</p>
                              )}
                              <p className="text-[13px] flex items-center gap-1.5 mb-3" style={{ color: "var(--text-tertiary)" }}>
                                <Clock size={13} /> {event.building}{event.address ? `, ${event.address}` : ""}
                              </p>

                              {hasLaptop && (
                                <div className="rounded-[var(--radius-md)] p-3 mb-3 flex items-center gap-2.5" style={{ background: "var(--info-soft)" }}>
                                  <Laptop size={15} style={{ color: "var(--info)" }} />
                                  <p className="text-[13px]" style={{ color: "var(--info)" }}>Возьмите ноутбук с зарядкой</p>
                                </div>
                              )}

                              {event.materials && event.materials.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {event.materials.map((material) => (
                                    <span key={material} className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                                      {material}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-3 mb-3">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Связанные материалы</p>
                                    {canManageEventAssets && (
                                      <ActionIconButton
                                        kind="plus"
                                        label="Добавить материал"
                                        onClick={(clickEvent) => {
                                          clickEvent.preventDefault();
                                          setAdminState({ kind: "material", mode: "create", defaults: { eventId: event.id, day: event.day } });
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    {eventMaterials.map((material) => (
                                      <div key={material.id} className="rounded-[var(--radius-md)] border p-3 flex items-center gap-3" style={{ borderColor: "var(--line-subtle)" }}>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>{material.title}</p>
                                          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{material.type}{material.url ? " · есть ссылка" : ""}</p>
                                        </div>
                                        <button onClick={() => openExternal(material.url)} style={{ color: "var(--info)" }}>
                                          <ExternalLink size={16} />
                                        </button>
                                        {canManageEventAssets && (
                                          <ActionIconButton
                                            kind="edit"
                                            label="Редактировать материал"
                                            onClick={(clickEvent) => {
                                              clickEvent.preventDefault();
                                              setAdminState({ kind: "material", mode: "edit", entity: material });
                                            }}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Связанные ссылки</p>
                                    {canManageEventAssets && (
                                      <ActionIconButton
                                        kind="plus"
                                        label="Добавить ссылку"
                                        onClick={(clickEvent) => {
                                          clickEvent.preventDefault();
                                          setAdminState({ kind: "resource", mode: "create", defaults: { eventId: event.id, day: event.day } });
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    {eventResources.map((resource) => (
                                      <div key={resource.id} className="rounded-[var(--radius-md)] border p-3 flex items-center gap-3" style={{ borderColor: "var(--line-subtle)" }}>
                                        <Link2 size={16} style={{ color: "var(--text-secondary)" }} />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>{resource.title}</p>
                                          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{resource.kind}</p>
                                        </div>
                                        <button onClick={() => openExternal(resource.url)} style={{ color: "var(--info)" }}>
                                          <ExternalLink size={16} />
                                        </button>
                                        {canManageEventAssets && (
                                          <ActionIconButton
                                            kind="edit"
                                            label="Редактировать ссылку"
                                            onClick={(clickEvent) => {
                                              clickEvent.preventDefault();
                                              setAdminState({ kind: "resource", mode: "edit", entity: resource });
                                            }}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={() => openExternal(`https://yandex.ru/maps/?text=${encodeURIComponent(event.address || event.place)}`)}
                                  className="flex items-center gap-1.5 text-[14px]"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  <Navigation size={15} /> Маршрут
                                </button>
                                {event.status === "in_progress" && (
                                  <button
                                    onClick={() => void checkInEvent(event.id)}
                                    className="ml-auto flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-[var(--radius-md)]"
                                    style={{
                                      background: isChecked ? "var(--success-soft)" : "var(--text-primary)",
                                      color: isChecked ? "var(--success)" : "var(--text-inverted)",
                                    }}
                                  >
                                    {isChecked ? <><Check size={13} /> Отмечено</> : "Я здесь"}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </SurfaceCard>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="hidden xl:flex xl:flex-col gap-4">
            <SurfaceCard className="p-5">
              <p className="text-[13px] mb-3" style={{ color: "var(--text-tertiary)" }}>Сводка дня</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Событий", value: String(dayEvents.length) },
                  { label: "В процессе", value: String(inProgressCount) },
                  { label: "Завершено", value: String(completedCount) },
                  { label: "Выбранный день", value: `День ${activeDay}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-[var(--radius-md)] p-3" style={{ background: "var(--bg-subtle)" }}>
                    <p className="text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
                    <p className="text-[18px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            {selectedEvent && (
              <SurfaceCard className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Выбранное событие</p>
                    <h3 className="text-[18px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                      {selectedEvent.title}
                    </h3>
                  </div>
                  <StatusBadge status={selectedEvent.status} />
                </div>
                <div className="space-y-3 text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  <p className="flex items-center gap-2">
                    <Clock size={15} /> {selectedEvent.startAt}–{selectedEvent.endAt}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={15} /> {selectedEvent.place}
                  </p>
                  {selectedEvent.description && (
                    <p>{selectedEvent.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-[var(--radius-md)] p-3" style={{ background: "var(--bg-subtle)" }}>
                    <p className="text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>Материалы</p>
                    <p className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{selectedEventMaterials.length}</p>
                  </div>
                  <div className="rounded-[var(--radius-md)] p-3" style={{ background: "var(--bg-subtle)" }}>
                    <p className="text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>Ссылки</p>
                    <p className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{selectedEventResources.length}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <button
                    onClick={() => openExternal(`https://yandex.ru/maps/?text=${encodeURIComponent(selectedEvent.address || selectedEvent.place)}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)]"
                    style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 500 }}
                  >
                    <Navigation size={16} /> Открыть маршрут
                  </button>
                  {selectedEventMaterials.length > 0 && (
                    <button
                      onClick={() => navigate(`/materials?event=${selectedEvent.id}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)]"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                    >
                      <FolderOpen size={16} /> Перейти к материалам
                    </button>
                  )}
                </div>
              </SurfaceCard>
            )}
          </div>
        </div>

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
    </div>
  );
}
