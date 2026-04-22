import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CalendarDays, ClipboardCheck } from "lucide-react";

import { PageShell, SurfaceCard } from "../common";
import { useAppData } from "../../lib/app-data";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "../admin-ui";
import { AttendanceUploader } from "./AttendanceUploader";
import { DaySection } from "./DaySection";
import { DaySidebar } from "./DaySidebar";
import { groupEventsByDay } from "./types";

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
      void navigate("/schedule", { replace: true });
      return;
    }

    if (adminAction === "create-event" && data.currentUser.capabilities.canCreateEvents) {
      setAdminState({ kind: "event", mode: "create" });
      void navigate("/schedule", { replace: true });
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
  const manageableEventOptions = (
    currentUser.capabilities.canEditAllEvents
      ? data.events
      : data.events.filter((event) => event.teacherIds.includes(currentUser.id))
  ).map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));

  const registerDayRef = (day: number, node: HTMLElement | null) => {
    if (node) {
      dayRefs.current.set(day, node);
    } else {
      dayRefs.current.delete(day);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-card)" }}>
      <PageShell size="wide">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[var(--text-primary)]">Расписание</h1>
              <p
                className="text-[13px] mt-1 flex items-center gap-1.5"
                style={{ color: "var(--text-tertiary)" }}
              >
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
                  <DaySection
                    key={group.day}
                    group={group}
                    currentDay={ui.currentDay}
                    dayTitle={data.camp.dayTitles?.[String(group.day)]}
                    materials={materials}
                    resources={resources}
                    currentUser={currentUser}
                    expanded={expanded}
                    onToggleExpand={setExpanded}
                    navigate={navigate}
                    setAdminState={setAdminState}
                    setEntityVisibility={setEntityVisibility}
                    deleteAdminEntity={deleteAdminEntity}
                    checkInEvent={checkInEvent}
                    registerDayRef={registerDayRef}
                  />
                ))}
              </div>
            )}
          </div>

          <DaySidebar
            groups={groups}
            currentDay={ui.currentDay}
            totalDays={ui.totalDays}
            dayRefs={dayRefs}
          />
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
            await updateAdminEntity(
              resource,
              (adminState.entity as { id: string }).id,
              normalizedPayload,
            );
          }}
        />
      </PageShell>
    </div>
  );
}
