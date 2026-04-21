import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Download, ExternalLink, FileText, Video, BookOpen, CheckSquare, File, Link2 } from "lucide-react";
import { EmptyState, PageShell, SectionHeader, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { MATERIAL_TYPE_LABELS } from "../lib/options";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

const TYPE_ICONS: Record<string, typeof FileText> = {
  presentation: FileText,
  recording: Video,
  guide: BookOpen,
  checklist: CheckSquare,
  org_doc: File,
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  presentation: { bg: "var(--info-soft)", color: "var(--info)" },
  recording: { bg: "var(--danger-soft)", color: "var(--danger)" },
  guide: { bg: "#f5f3ff", color: "#7c3aed" },
  checklist: { bg: "var(--success-soft)", color: "var(--success)" },
  org_doc: { bg: "var(--bg-subtle)", color: "var(--text-secondary)" },
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

export function MaterialsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity } = useAppData();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);
  const studyResources = useMemo(
    () => (data ? data.resources.filter((resource) => resource.category === "study") : []),
    [data],
  );
  const searchParams = new URLSearchParams(location.search);
  const eventFilter = searchParams.get("event");
  const adminAction = searchParams.get("admin");

  useEffect(() => {
    if (!data) {
      return;
    }
    if (adminAction === "create-material" && data.currentUser.capabilities.canManageMaterials) {
      setAdminState({ kind: "material", mode: "create" });
      navigate(location.pathname + (eventFilter ? `?event=${eventFilter}` : ""), { replace: true });
    }
  }, [adminAction, data, eventFilter, location.pathname, navigate]);

  if (!data) {
    return null;
  }

  const { materials } = data;
  const types = ["all", ...Object.keys(MATERIAL_TYPE_LABELS)];
  const days = [...new Set(materials.filter((material) => material.day).map((material) => material.day!))].sort((left, right) => left - right);
  const eventOptions = data.events.map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));

  const filtered = materials.filter((material) => {
    if (typeFilter !== "all" && material.type !== typeFilter) {
      return false;
    }
    if (dayFilter !== "all" && material.day !== Number(dayFilter)) {
      return false;
    }
    if (eventFilter && material.eventId !== eventFilter) {
      return false;
    }
    return true;
  });

  const newMaterials = filtered.filter((material) => material.isNew);
  const otherMaterials = filtered.filter((material) => !material.isNew);

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageShell size="wide">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-[var(--text-primary)]">Материалы</h1>
          {data.currentUser.capabilities.canManageMaterials && (
            <ActionIconButton
              kind="plus"
              label="Добавить материал"
              onClick={(event) => {
                event.preventDefault();
                setAdminState({ kind: "material", mode: "create", defaults: eventFilter ? { eventId: eventFilter } : undefined });
              }}
            />
          )}
        </div>

        <div className="px-5 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="px-3.5 py-1.5 rounded-[var(--radius-sm)] text-[13px] whitespace-nowrap transition-colors"
                style={{
                  background: typeFilter === type ? "var(--text-primary)" : "var(--bg-card)",
                  color: typeFilter === type ? "var(--text-inverted)" : "var(--text-secondary)",
                  border: typeFilter === type ? "none" : "1px solid var(--line-subtle)",
                  fontWeight: typeFilter === type ? 500 : 400,
                }}
              >
                {type === "all" ? "Все" : MATERIAL_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setDayFilter("all")}
              className="px-3.5 py-1.5 rounded-[var(--radius-sm)] text-[13px] whitespace-nowrap transition-colors"
              style={{
                background: dayFilter === "all" ? "var(--brand)" : "var(--bg-card)",
                color: dayFilter === "all" ? "var(--brand-contrast)" : "var(--text-secondary)",
                border: dayFilter === "all" ? "none" : "1px solid var(--line-subtle)",
                fontWeight: dayFilter === "all" ? 500 : 400,
              }}
            >
              Все дни
            </button>
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setDayFilter(String(day))}
                className="px-3.5 py-1.5 rounded-[var(--radius-sm)] text-[13px] whitespace-nowrap transition-colors"
                style={{
                  background: dayFilter === String(day) ? "var(--brand)" : "var(--bg-card)",
                  color: dayFilter === String(day) ? "var(--brand-contrast)" : "var(--text-secondary)",
                  border: dayFilter === String(day) ? "none" : "1px solid var(--line-subtle)",
                  fontWeight: dayFilter === String(day) ? 500 : 400,
                }}
              >
                День {day}
              </button>
            ))}
          </div>
        </div>

        {studyResources.length > 0 && (
          <div className="px-5 mb-4">
            <SectionHeader
              title="Полезные ссылки"
              right={(
                data.currentUser.capabilities.canManageResources ? (
                  <ActionIconButton
                    kind="plus"
                    label="Добавить ссылку"
                    onClick={(event) => {
                      event.preventDefault();
                      setAdminState({ kind: "resource", mode: "create", defaults: { category: "study" } });
                    }}
                  />
                ) : undefined
              )}
            />
            <div className="space-y-2">
              {studyResources.map((resource) => (
                <SurfaceCard key={resource.id} className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: "var(--bg-subtle)" }}>
                    <Link2 size={18} style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] line-clamp-1" style={{ color: "var(--text-primary)" }}>{resource.title}</p>
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      <span>{RESOURCE_KIND_LABELS[resource.kind] ?? resource.kind}</span>
                      {resource.day && <span>День {resource.day}</span>}
                    </div>
                  </div>
                  <button onClick={() => openExternal(resource.url)} style={{ color: "var(--info)" }}>
                    <ExternalLink size={19} />
                  </button>
                  {data.currentUser.capabilities.canManageResources && (
                    <ActionIconButton
                      kind="edit"
                      label="Редактировать ссылку"
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminState({ kind: "resource", mode: "edit", entity: resource });
                      }}
                    />
                  )}
                </SurfaceCard>
              ))}
            </div>
          </div>
        )}

        {newMaterials.length > 0 && (
          <div className="px-5 mb-4">
            <SectionHeader title="Новое" />
            <div className="space-y-2">
              {newMaterials.map((material) => {
                const Icon = TYPE_ICONS[material.type];
                const colors = TYPE_COLORS[material.type];
                return (
                  <SurfaceCard key={material.id} className="p-3.5 flex items-center gap-3" style={{ borderColor: "var(--brand)" }}>
                    <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: colors.bg }}>
                      <Icon size={18} style={{ color: colors.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] line-clamp-1" style={{ color: "var(--text-primary)" }}>{material.title}</p>
                      <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                        <span>{MATERIAL_TYPE_LABELS[material.type]}</span>
                        {material.fileSize && <span>{material.fileSize}</span>}
                        {material.day && <span>День {material.day}</span>}
                      </div>
                    </div>
                    <button onClick={() => openExternal(material.url)} style={{ color: "var(--info)" }}>
                      <Download size={19} />
                    </button>
                    {data.currentUser.capabilities.canManageMaterials && (
                      <ActionIconButton
                        kind="edit"
                        label="Редактировать материал"
                        onClick={(event) => {
                          event.preventDefault();
                          setAdminState({ kind: "material", mode: "edit", entity: material });
                        }}
                      />
                    )}
                  </SurfaceCard>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-5 pb-8">
          {newMaterials.length > 0 && otherMaterials.length > 0 && (
            <SectionHeader title="Все материалы" />
          )}
          <div className="space-y-2">
            {otherMaterials.map((material) => {
              const Icon = TYPE_ICONS[material.type];
              const colors = TYPE_COLORS[material.type];
              return (
                <SurfaceCard key={material.id} className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: colors.bg }}>
                    <Icon size={18} style={{ color: colors.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] line-clamp-1" style={{ color: "var(--text-primary)" }}>{material.title}</p>
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      <span>{MATERIAL_TYPE_LABELS[material.type]}</span>
                      {material.fileSize && <span>{material.fileSize}</span>}
                      {material.day && <span>День {material.day}</span>}
                    </div>
                  </div>
                  <button onClick={() => openExternal(material.url)} style={{ color: "var(--text-tertiary)" }}>
                    <Download size={19} />
                  </button>
                  {data.currentUser.capabilities.canManageMaterials && (
                    <ActionIconButton
                      kind="edit"
                      label="Редактировать материал"
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminState({ kind: "material", mode: "edit", entity: material });
                      }}
                    />
                  )}
                </SurfaceCard>
              );
            })}
          </div>
          {filtered.length === 0 && <EmptyState text="Материалов не найдено" />}
        </div>
      </PageShell>

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
    </div>
  );
}
