import type { NavigateFunction } from "react-router";
import { FolderOpen, Laptop, MapPin } from "lucide-react";

import { SurfaceCard } from "../common";
import { ActionIconButton, type AdminEntityKind } from "../admin-ui";
import type { AdminResourcePath, CurrentUser, Event, Material, Resource } from "../../lib/domain";
import { isCountableEvent, splitEventTitle } from "../../lib/events";
import { AttendanceBadge } from "./AttendanceBadge";
import { EventDetails } from "./EventDetails";

type AdminStateSetter = (
  state: {
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null,
) => void;

interface EventCardProps {
  event: Event;
  eventMaterials: Material[];
  eventResources: Resource[];
  groupTheme: string | null;
  isExpanded: boolean;
  currentUser: CurrentUser;
  onToggleExpand: (nextId: string | null) => void;
  navigate: NavigateFunction;
  setAdminState: AdminStateSetter;
  setEntityVisibility: (
    resource: AdminResourcePath,
    entityId: string,
    hidden: boolean,
  ) => Promise<void>;
  deleteAdminEntity: (resource: AdminResourcePath, entityId: string) => Promise<void>;
  checkInEvent: (eventId: string) => Promise<void>;
}

export function EventCard({
  event,
  eventMaterials,
  eventResources,
  groupTheme,
  isExpanded,
  currentUser,
  onToggleExpand,
  navigate,
  setAdminState,
  setEntityVisibility,
  deleteAdminEntity,
  checkInEvent,
}: EventCardProps) {
  const hasLaptop = (event.materials ?? []).some((item) => item.toLowerCase().includes("ноутбук"));
  const isChecked = event.attendance === "confirmed";
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
    <div className="relative pl-[52px]">
      <div
        className={`absolute left-[20px] top-4 w-[12px] h-[12px] rounded-full ${event.status === "in_progress" ? "animate-pulse" : ""}`}
        style={{
          backgroundColor: dotColor,
          border: "2px solid var(--bg-card)",
        }}
      />
      <SurfaceCard
        onClick={() => onToggleExpand(isExpanded ? null : event.id)}
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
              counts={isCountableEvent(event)}
            />
            {hasLaptop && (
              <span
                className="flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-[var(--radius-sm)]"
                style={{
                  background: "var(--info-soft)",
                  color: "var(--info)",
                }}
              >
                <Laptop size={12} /> Ноутбук
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {teacher &&
              (event.teacherIds[0] ? (
                <button
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    void navigate(`/people?user=${event.teacherIds[0]}`);
                  }}
                  className="text-[12px] px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--line-subtle)]"
                  style={{
                    background: "var(--bg-subtle)",
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  {teacher}
                </button>
              ) : (
                <span
                  className="text-[12px] px-2.5 py-1 rounded-full"
                  style={{
                    background: "var(--bg-subtle)",
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  {teacher}
                </span>
              ))}
            {event.status === "in_progress" && (
              <span
                className="text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5"
                style={{
                  background: "var(--success-soft)",
                  color: "var(--success)",
                  fontWeight: 600,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--success)" }}
                />
                Идёт сейчас
              </span>
            )}
            {event.status === "changed" && (
              <span
                className="text-[12px] px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--warning-soft)",
                  color: "var(--warning)",
                  fontWeight: 600,
                }}
              >
                Изменено
              </span>
            )}
            {event.status === "cancelled" && (
              <span
                className="text-[12px] px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  fontWeight: 600,
                }}
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
                    setAdminState({
                      kind: "event",
                      mode: "edit",
                      entity: event,
                    });
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
            color: event.status === "cancelled" ? "var(--text-tertiary)" : "var(--text-primary)",
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
              void navigate(`/materials?event=${event.id}`);
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <FolderOpen size={12} />
            Материалы ({eventMaterials.length})
          </button>
        )}

        {isExpanded && (
          <EventDetails
            event={event}
            eventMaterials={eventMaterials}
            eventResources={eventResources}
            groupTheme={groupTheme}
            hasLaptop={hasLaptop}
            isChecked={isChecked}
            checkInEvent={checkInEvent}
          />
        )}
      </SurfaceCard>
    </div>
  );
}
