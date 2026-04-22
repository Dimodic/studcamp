import type { NavigateFunction } from "react-router";

import type { AdminEntityKind } from "../../components/admin";
import type { AdminResourcePath, CurrentUser, Material, Resource } from "../../lib/domain";
import { EventCard } from "./EventCard";
import { formatDayHeader, type EventGroup } from "./types";

type AdminStateSetter = (
  state: {
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null,
) => void;

interface DaySectionProps {
  group: EventGroup;
  currentDay: number;
  dayTitle: string | undefined;
  materials: Material[];
  resources: Resource[];
  currentUser: CurrentUser;
  expanded: string | null;
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
  registerDayRef: (day: number, node: HTMLElement | null) => void;
}

export function DaySection({
  group,
  currentDay,
  dayTitle,
  materials,
  resources,
  currentUser,
  expanded,
  onToggleExpand,
  navigate,
  setAdminState,
  setEntityVisibility,
  deleteAdminEntity,
  checkInEvent,
  registerDayRef,
}: DaySectionProps) {
  const label = dayTitle ?? group.theme;

  return (
    <section
      ref={(node) => {
        registerDayRef(group.day, node);
      }}
    >
      <div className="sticky top-0 z-10 py-3" style={{ background: "var(--bg-card)" }}>
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
              background: group.day === currentDay ? "var(--brand-soft)" : "var(--bg-subtle)",
              color: group.day === currentDay ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: group.day === currentDay ? 600 : 400,
            }}
          >
            День {group.day}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--line-subtle)" }} />
        </div>
        {label && (
          <p
            className="text-[15px] mt-1.5"
            style={{ color: "var(--text-primary)", fontWeight: 600 }}
          >
            {label}
          </p>
        )}
      </div>

      <div className="relative">
        <div
          className="absolute left-[25px] top-0 bottom-0 w-[2px]"
          style={{ background: "var(--line-subtle)" }}
        />
        <div className="space-y-3">
          {group.events.map((event) => {
            const isExpanded = expanded === event.id;
            const eventMaterials = materials.filter((material) => material.eventId === event.id);
            const eventResources = resources.filter((resource) => resource.eventId === event.id);

            return (
              <EventCard
                key={event.id}
                event={event}
                eventMaterials={eventMaterials}
                eventResources={eventResources}
                groupTheme={group.theme}
                isExpanded={isExpanded}
                currentUser={currentUser}
                onToggleExpand={onToggleExpand}
                navigate={navigate}
                setAdminState={setAdminState}
                setEntityVisibility={setEntityVisibility}
                deleteAdminEntity={deleteAdminEntity}
                checkInEvent={checkInEvent}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
