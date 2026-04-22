import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { EmptyState, PageShell } from "../common";
import { useAppData } from "../../lib/app-data";
import type { Material, Resource } from "../../lib/domain";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "../admin-ui";
import { DayGroupSection } from "./DayGroupSection";
import { DaysSidebar } from "./DaysSidebar";
import { OrgDocsSection } from "./OrgDocsSection";
import { StudyResourcesSection } from "./StudyResourcesSection";
import { UndatedSection } from "./UndatedSection";
import { groupMaterialsByDay, type DayGroup } from "./types";

export function MaterialsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity, deleteAdminEntity, setEntityVisibility } =
    useAppData();
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);
  const dayRefs = useRef(new Map<number, HTMLElement>());
  const didInitialScroll = useRef(false);

  const searchParams = new URLSearchParams(location.search);
  const eventFilter = searchParams.get("event");
  const adminAction = searchParams.get("admin");

  const studyResources = useMemo(
    () => (data ? data.resources.filter((resource) => resource.category === "study") : []),
    [data],
  );

  const { orgDocs, groups, undated, eventById } = useMemo(() => {
    if (!data) {
      return {
        orgDocs: [] as Material[],
        groups: [] as DayGroup[],
        undated: [] as Material[],
        eventById: new Map<string, { title: string; date: string }>(),
      };
    }
    const orgDocs = data.materials
      .filter((material) => material.type === "org_doc")
      .sort((a, b) => {
        return a.title.localeCompare(b.title, "ru");
      });
    const filtered = eventFilter
      ? data.materials.filter((material) => material.eventId === eventFilter)
      : data.materials;
    const { groups, undated } = groupMaterialsByDay(filtered, data.camp);
    const eventById = new Map(
      data.events.map((event) => [event.id, { title: event.title, date: event.date }]),
    );
    return { orgDocs, groups, undated, eventById };
  }, [data, eventFilter]);

  useEffect(() => {
    if (!data) return;
    if (adminAction === "create-material" && data.currentUser.capabilities.canManageMaterials) {
      setAdminState({ kind: "material", mode: "create" });
      void navigate(location.pathname + (eventFilter ? `?event=${eventFilter}` : ""), {
        replace: true,
      });
    }
  }, [adminAction, data, eventFilter, location.pathname, navigate]);

  useEffect(() => {
    if (!data || didInitialScroll.current || groups.length === 0) return;
    const today = data.ui.currentDay;
    const target = groups.find((group) => group.day === today) ?? groups[0];
    const node = dayRefs.current.get(target.day);
    if (node) {
      node.scrollIntoView({ block: "start" });
      didInitialScroll.current = true;
    }
  }, [data, groups]);

  if (!data) {
    return null;
  }

  const eventOptions = data.events.map((event) => ({
    id: event.id,
    label: `${event.title} · ${event.date}`,
  }));
  const canManageMaterials = data.currentUser.capabilities.canManageMaterials;
  const canManageResources = data.currentUser.capabilities.canManageResources;

  const editMaterial = (material: Material) =>
    setAdminState({ kind: "material", mode: "edit", entity: material });

  const eventLabelFor = (material: Material): string | null => {
    if (!material.eventId) return null;
    const event = eventById.get(material.eventId);
    return event ? event.title : null;
  };

  const emptyState = groups.length === 0 && undated.length === 0;

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Назад"
            className="w-9 h-9 -ml-2 rounded-[var(--radius-md)] flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[var(--text-primary)] truncate">Материалы</h1>
            <p
              className="text-[13px] mt-1 flex items-center gap-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              <CalendarDays size={14} /> День {data.ui.currentDay} из {data.ui.totalDays}
            </p>
          </div>
        </div>
        {canManageMaterials && (
          <ActionIconButton
            kind="plus"
            label="Добавить материал"
            onClick={(event) => {
              event.preventDefault();
              setAdminState({
                kind: "material",
                mode: "create",
                defaults: eventFilter ? { eventId: eventFilter } : undefined,
              });
            }}
          />
        )}
      </div>

      <div className="px-5 pb-8 xl:grid xl:grid-cols-[minmax(0,1.7fr)_320px] xl:gap-6 xl:items-start">
        <div className="min-w-0">
          {emptyState ? (
            <EmptyState text="Материалов пока нет" />
          ) : (
            <div className="space-y-6">
              {undated.length > 0 && (
                <UndatedSection
                  undated={undated}
                  canManageMaterials={canManageMaterials}
                  eventLabelFor={eventLabelFor}
                  onEditMaterial={editMaterial}
                  onDeleteMaterial={(material) => void deleteAdminEntity("materials", material.id)}
                  onToggleMaterialHidden={(material) =>
                    void setEntityVisibility("materials", material.id, !material.isHidden)
                  }
                />
              )}

              {groups.map((group) => (
                <DayGroupSection
                  key={group.day}
                  group={group}
                  currentDay={data.ui.currentDay}
                  canManageMaterials={canManageMaterials}
                  eventLabelFor={eventLabelFor}
                  onEditMaterial={editMaterial}
                  onDeleteMaterial={(material) => void deleteAdminEntity("materials", material.id)}
                  onToggleMaterialHidden={(material) =>
                    void setEntityVisibility("materials", material.id, !material.isHidden)
                  }
                  dayRefs={dayRefs}
                />
              ))}
            </div>
          )}
        </div>

        <div className="hidden xl:flex xl:flex-col gap-4">
          {groups.length > 0 && (
            <DaysSidebar
              groups={groups}
              currentDay={data.ui.currentDay}
              totalDays={data.ui.totalDays}
              dayRefs={dayRefs}
            />
          )}

          {orgDocs.length > 0 && (
            <OrgDocsSection
              orgDocs={orgDocs}
              canManageMaterials={canManageMaterials}
              onAddOrgDoc={() =>
                setAdminState({
                  kind: "material",
                  mode: "create",
                  defaults: { type: "org_doc" },
                })
              }
              onEditMaterial={editMaterial}
              onDeleteMaterial={(material: Material) =>
                void deleteAdminEntity("materials", material.id)
              }
              onToggleMaterialHidden={(material: Material) =>
                void setEntityVisibility("materials", material.id, !material.isHidden)
              }
            />
          )}

          {studyResources.length > 0 && (
            <StudyResourcesSection
              studyResources={studyResources}
              canManageResources={canManageResources}
              onAddResource={() =>
                setAdminState({
                  kind: "resource",
                  mode: "create",
                  defaults: { category: "study" },
                })
              }
              onEditResource={(resource: Resource) =>
                setAdminState({ kind: "resource", mode: "edit", entity: resource })
              }
              onDeleteResource={(resource: Resource) =>
                void deleteAdminEntity("resources", resource.id)
              }
              onToggleResourceHidden={(resource: Resource) =>
                void setEntityVisibility("resources", resource.id, !resource.isHidden)
              }
            />
          )}
        </div>
      </div>

      <AdminEditorModal
        open={adminState !== null}
        kind={adminState?.kind ?? null}
        mode={adminState?.mode ?? "create"}
        entity={adminState?.entity}
        defaults={adminState?.defaults}
        eventOptions={eventOptions}
        onClose={() => setAdminState(null)}
        onSubmit={async (payload) => {
          if (!adminState) {
            return;
          }
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
