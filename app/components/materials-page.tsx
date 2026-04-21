import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Download,
  ExternalLink,
  File,
  FileText,
  Link2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, PageShell, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { MATERIAL_TYPE_LABELS } from "../lib/options";
import type { Camp, Material } from "../lib/domain";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

const TYPE_ICONS: Record<string, LucideIcon> = {
  presentation: FileText,
  recording: Video,
  guide: BookOpen,
  checklist: CheckSquare,
  org_doc: File,
};

const TYPE_ACCENT: Record<string, string> = {
  presentation: "var(--accent-blue)",
  recording: "var(--accent-pink)",
  guide: "var(--accent-violet)",
  checklist: "var(--accent-teal)",
  org_doc: "var(--text-secondary)",
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

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function dateForDay(camp: Camp, day: number): Date | null {
  const start = parseDate(camp.dates.start);
  if (!start) return null;
  return new Date(start.getTime() + (day - 1) * 86400000);
}

function formatDayHeader(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .toUpperCase();
}

interface DateParts {
  dayNumber: string;
  month: string;
  weekday: string;
}

function extractDateParts(date: Date): DateParts {
  const dayNumber = new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date);
  const month = new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date).replace(/\.$/, "");
  return {
    dayNumber,
    month,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
  };
}

interface DayGroup {
  day: number;
  date: Date | null;
  materials: Material[];
}

function groupMaterialsByDay(materials: Material[], camp: Camp): { groups: DayGroup[]; undated: Material[] } {
  const byDay = new Map<number, Material[]>();
  const undated: Material[] = [];

  for (const material of materials) {
    if (material.type === "org_doc") {
      continue;
    }
    if (material.day == null) {
      undated.push(material);
      continue;
    }
    const bucket = byDay.get(material.day) ?? [];
    bucket.push(material);
    byDay.set(material.day, bucket);
  }

  const groups: DayGroup[] = [...byDay.entries()]
    .map(([day, items]) => ({
      day,
      date: dateForDay(camp, day),
      materials: items.sort((a, b) => {
        return a.title.localeCompare(b.title, "ru");
      }),
    }))
    .sort((a, b) => a.day - b.day);

  return { groups, undated };
}

interface MaterialRowProps {
  material: Material;
  eventLabel?: string | null;
  canEdit: boolean;
  onEdit: () => void;
  onDelete?: () => void;
}

function MaterialRow({ material, eventLabel, canEdit, onEdit, onDelete }: MaterialRowProps) {
  const Icon = TYPE_ICONS[material.type] ?? File;
  const accent = TYPE_ACCENT[material.type] ?? "var(--text-secondary)";
  const metaParts = [MATERIAL_TYPE_LABELS[material.type]];
  if (material.fileSize) metaParts.push(material.fileSize);
  if (material.topic) metaParts.push(material.topic);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
    >
      <div
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={
          {
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            color: accent,
          } as CSSProperties
        }
      >
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-snug" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {material.title}
        </p>
        <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {metaParts.join(" · ")}
          {eventLabel && (
            <>
              <span> · </span>
              <span style={{ color: "var(--text-secondary)" }}>{eventLabel}</span>
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => openExternal(material.url)}
        aria-label={`Открыть ${material.title}`}
        className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center transition-colors hover:bg-[var(--bg-card)]"
        style={{ color: "var(--info)" }}
      >
        <Download size={18} />
      </button>
      {canEdit && (
        <ActionIconButton
          kind="edit"
          label="Редактировать материал"
          onClick={(event) => {
            event.preventDefault();
            onEdit();
          }}
        />
      )}
      {canEdit && onDelete && (
        <ActionIconButton
          kind="delete"
          label="Удалить материал"
          onClick={(event) => {
            event.preventDefault();
            if (window.confirm(`Удалить материал «${material.title}»?`)) {
              onDelete();
            }
          }}
        />
      )}
    </div>
  );
}

export function MaterialsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity, deleteAdminEntity } = useAppData();
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
    const eventById = new Map(data.events.map((event) => [event.id, { title: event.title, date: event.date }]));
    return { orgDocs, groups, undated, eventById };
  }, [data, eventFilter]);

  useEffect(() => {
    if (!data) return;
    if (adminAction === "create-material" && data.currentUser.capabilities.canManageMaterials) {
      setAdminState({ kind: "material", mode: "create" });
      navigate(location.pathname + (eventFilter ? `?event=${eventFilter}` : ""), { replace: true });
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

  const eventOptions = data.events.map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));
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
        <div>
          <h1 className="text-[var(--text-primary)]">Материалы</h1>
          <p className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
            <CalendarDays size={14} /> День {data.ui.currentDay} из {data.ui.totalDays}
          </p>
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
                <section>
                  <div
                    className="sticky top-0 z-10 py-3 flex items-center gap-3"
                    style={{ background: "var(--bg-app)" }}
                  >
                    <p
                      className="text-[12px] tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                    >
                      ОБЩИЕ МАТЕРИАЛЫ
                    </p>
                    <div className="flex-1 h-px" style={{ background: "var(--line-subtle)" }} />
                  </div>
                  <div className="space-y-3">
                    {undated.map((material) => (
                      <MaterialRow
                        key={material.id}
                        material={material}
                        eventLabel={eventLabelFor(material)}
                        canEdit={canManageMaterials}
                        onEdit={() => editMaterial(material)}
                        onDelete={() => void deleteAdminEntity("materials", material.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

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
                  className="scroll-mt-20"
                >
                  <div
                    className="sticky top-0 z-10 py-3 flex items-center gap-3"
                    style={{ background: "var(--bg-app)" }}
                  >
                    <p
                      className="text-[12px] tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                    >
                      {group.date ? formatDayHeader(group.date) : `ДЕНЬ ${group.day}`}
                    </p>
                    <span
                      className="text-[12px] px-2 py-0.5 rounded-[var(--radius-sm)]"
                      style={{
                        background: group.day === data.ui.currentDay ? "var(--brand-soft)" : "var(--bg-subtle)",
                        color: group.day === data.ui.currentDay ? "var(--brand-contrast)" : "var(--text-secondary)",
                        fontWeight: group.day === data.ui.currentDay ? 600 : 400,
                      }}
                    >
                      День {group.day}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "var(--line-subtle)" }} />
                  </div>
                  <div className="space-y-3">
                    {group.materials.map((material) => (
                      <MaterialRow
                        key={material.id}
                        material={material}
                        eventLabel={eventLabelFor(material)}
                        canEdit={canManageMaterials}
                        onEdit={() => editMaterial(material)}
                        onDelete={() => void deleteAdminEntity("materials", material.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="hidden xl:flex xl:flex-col gap-4">
          {groups.length > 0 && (
            <SurfaceCard className="p-4">
              <div className="flex items-baseline justify-between mb-3 px-1">
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                  Дни кемпа
                </p>
                <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  {data.ui.currentDay} / {data.ui.totalDays}
                </p>
              </div>
              <div className="flex flex-col">
                {groups.map((group) => {
                  const parts = group.date ? extractDateParts(group.date) : null;
                  const isActive = group.day === data.ui.currentDay;
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
                          background: isActive ? "var(--brand)" : "var(--bg-subtle)",
                          color: isActive ? "var(--brand-contrast)" : "var(--text-primary)",
                        }}
                      >
                        <span className="text-[15px]" style={{ fontWeight: 600 }}>
                          {parts?.dayNumber ?? group.day}
                        </span>
                        <span
                          className="text-[9px] uppercase tracking-wider mt-0.5"
                          style={{
                            color: isActive ? "var(--brand-contrast)" : "var(--text-tertiary)",
                            opacity: isActive ? 0.75 : 1,
                          }}
                        >
                          {parts?.month ?? ""}
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
                          {parts?.weekday ?? `День ${group.day}`}
                        </p>
                        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                          День {group.day}
                        </p>
                      </div>
                      <span
                        className="text-[12px] px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: isActive ? "var(--brand-soft)" : "var(--bg-subtle)",
                          color: isActive ? "var(--brand-contrast)" : "var(--text-tertiary)",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {group.materials.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SurfaceCard>
          )}

          {orgDocs.length > 0 && (
            <SurfaceCard className="overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                  Орг. документы
                </p>
                {canManageMaterials && (
                  <ActionIconButton
                    kind="plus"
                    label="Добавить орг. документ"
                    onClick={(event) => {
                      event.preventDefault();
                      setAdminState({ kind: "material", mode: "create", defaults: { type: "org_doc" } });
                    }}
                  />
                )}
              </div>
              <div className="pb-2">
                {orgDocs.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <File size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
                    <button
                      type="button"
                      onClick={() => openExternal(material.url)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p
                        className="text-[13.5px] leading-snug truncate"
                        style={{ color: "var(--text-primary)", fontWeight: 500 }}
                      >
                        {material.title}
                      </p>
                      {material.topic && (
                        <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                          {material.topic}
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openExternal(material.url)}
                      className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                      style={{ color: "var(--info)" }}
                      aria-label={`Открыть ${material.title}`}
                    >
                      <ExternalLink size={14} />
                    </button>
                    {canManageMaterials && (
                      <>
                        <ActionIconButton
                          kind="edit"
                          label="Редактировать"
                          onClick={(event) => {
                            event.preventDefault();
                            editMaterial(material);
                          }}
                        />
                        <ActionIconButton
                          kind="delete"
                          label="Удалить"
                          onClick={(event) => {
                            event.preventDefault();
                            if (window.confirm(`Удалить «${material.title}»?`)) {
                              void deleteAdminEntity("materials", material.id);
                            }
                          }}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </SurfaceCard>
          )}

          {studyResources.length > 0 && (
            <SurfaceCard className="overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                  Полезные ссылки
                </p>
                {canManageResources && (
                  <ActionIconButton
                    kind="plus"
                    label="Добавить ссылку"
                    onClick={(event) => {
                      event.preventDefault();
                      setAdminState({ kind: "resource", mode: "create", defaults: { category: "study" } });
                    }}
                  />
                )}
              </div>
              <div className="pb-2">
                {studyResources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <Link2 size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
                    <button
                      type="button"
                      onClick={() => openExternal(resource.url)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p
                        className="text-[13.5px] leading-snug truncate"
                        style={{ color: "var(--text-primary)", fontWeight: 500 }}
                      >
                        {resource.title}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {RESOURCE_KIND_LABELS[resource.kind] ?? resource.kind}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openExternal(resource.url)}
                      className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                      style={{ color: "var(--info)" }}
                      aria-label={`Открыть ${resource.title}`}
                    >
                      <ExternalLink size={14} />
                    </button>
                    {canManageResources && (
                      <>
                        <ActionIconButton
                          kind="edit"
                          label="Редактировать"
                          onClick={(event) => {
                            event.preventDefault();
                            setAdminState({ kind: "resource", mode: "edit", entity: resource });
                          }}
                        />
                        <ActionIconButton
                          kind="delete"
                          label="Удалить"
                          onClick={(event) => {
                            event.preventDefault();
                            if (window.confirm(`Удалить ссылку «${resource.title}»?`)) {
                              void deleteAdminEntity("resources", resource.id);
                            }
                          }}
                        />
                      </>
                    )}
                  </div>
                ))}
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
