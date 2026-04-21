import { useEffect, useState, type CSSProperties } from "react";
import { Clock, Check, Users, AlertCircle, ExternalLink, Link2 } from "lucide-react";
import { PageShell, PrimaryButton, SectionHeader, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import type { ProjectSelectionPhase } from "../lib/domain";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

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

function PhaseBanner({ phase, selectedCount }: { phase: ProjectSelectionPhase; selectedCount: number }) {
  if (phase === "countdown") {
    return (
      <SurfaceCard className="p-8 text-center">
        <Clock size={36} className="mx-auto mb-4" style={{ color: "var(--text-tertiary)" }} />
        <h2 className="text-[var(--text-primary)] mb-2">Выбор скоро откроется</h2>
        <p className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>Следите за орг-обновлениями и карточками проектов.</p>
      </SurfaceCard>
    );
  }

  if (phase === "open") {
    return (
      <div
        className="rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3"
        style={{ background: "var(--warning-soft)", border: "1px solid rgba(230, 81, 0, 0.15)" }}
      >
        <AlertCircle size={18} style={{ color: "var(--warning)" }} />
        <div className="flex-1">
          <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>
            Расставьте приоритеты — до 5 проектов
          </p>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Выбрано: {selectedCount}/5
          </p>
        </div>
      </div>
    );
  }

  if (phase === "closed") {
    return (
      <SurfaceCard className="p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <Check size={18} style={{ color: "var(--success)" }} />
          <h2 className="text-[var(--text-primary)]">Выбор проектов завершён</h2>
        </div>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Ниже оставили все карточки и дополнительные ссылки, чтобы проектами было удобно пользоваться и после дедлайна выбора.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="p-6">
      <div className="flex items-center gap-2.5 mb-2">
        <Check size={18} style={{ color: "var(--success)" }} />
        <h2 className="text-[var(--text-primary)]">Результаты опубликованы</h2>
      </div>
      <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
        Используйте список проектов и ресурсы ниже как справочник по задачам и материалам менторов.
      </p>
    </SurfaceCard>
  );
}

export function ProjectsPage() {
  const { data, saveProjectPriorities, createAdminEntity, updateAdminEntity } = useAppData();
  const [priorities, setPriorities] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    if (data) {
      setPriorities(data.projectPriorities);
    }
  }, [data]);

  if (!data) {
    return null;
  }

  const phase = data.projectSelectionPhase as ProjectSelectionPhase;
  const projectResources = data.resources.filter((resource) => resource.category === "projects");
  const eventOptions = data.events.map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));

  const togglePriority = (id: string) => {
    if (phase !== "open") {
      return;
    }
    setSaved(false);
    setPriorities((previous) => {
      if (previous.includes(id)) {
        return previous.filter((projectId) => projectId !== id);
      }
      if (previous.length >= 5) {
        return previous;
      }
      return [...previous, id];
    });
  };

  const getPriorityIndex = (id: string) => priorities.indexOf(id);

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
        <h1 className="text-[var(--text-primary)]">Проекты</h1>
        {data.currentUser.capabilities.canManageProjects && (
          <ActionIconButton
            kind="plus"
            label="Создать проект"
            onClick={(event) => {
              event.preventDefault();
              setAdminState({ kind: "project", mode: "create" });
            }}
          />
        )}
      </div>

      <div className="px-5 mb-4">
        <PhaseBanner phase={phase} selectedCount={priorities.length} />
      </div>

      <div className="px-5 pb-4 space-y-3">
        {data.projects.map((project) => {
          const index = getPriorityIndex(project.id);
          const selected = index >= 0;
          return (
            <SurfaceCard
              key={project.id}
              onClick={() => togglePriority(project.id)}
              className={`p-4 transition-all ${selected ? "ring-2" : ""} ${phase === "open" ? "cursor-pointer" : ""}`}
              style={{
                borderColor: selected ? "var(--brand)" : undefined,
                "--tw-ring-color": "var(--brand)",
              } as CSSProperties}
            >
              <div className="flex items-start gap-3">
                {phase === "open" ? (
                  selected ? (
                    <div
                      className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[14px] shrink-0"
                      style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 600 }}
                    >
                      {index + 1}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "var(--bg-subtle)" }}>
                      <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>—</span>
                    </div>
                  )
                ) : (
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "var(--bg-subtle)" }}>
                    <Link2 size={15} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] mb-1" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {project.title}
                  </h3>
                  <p className="text-[14px] mb-2" style={{ color: "var(--text-secondary)" }}>
                    {project.shortDescription}
                  </p>
                  <div className="flex items-center gap-3 text-[13px] flex-wrap" style={{ color: "var(--text-tertiary)" }}>
                    <span className="px-2 py-0.5 rounded-[var(--radius-sm)]" style={{ background: "var(--bg-subtle)" }}>
                      {project.direction}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {project.minTeam}–{project.maxTeam}
                    </span>
                  </div>
                </div>
                {data.currentUser.capabilities.canManageProjects && (
                  <ActionIconButton
                    kind="edit"
                    label={`Редактировать ${project.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setAdminState({ kind: "project", mode: "edit", entity: project });
                    }}
                  />
                )}
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {phase === "open" && (
        <div className="px-5 pb-6">
          {saved ? (
            <button
              className="w-full py-3 rounded-[var(--radius-md)] text-[15px] flex items-center justify-center gap-2"
              style={{ background: "var(--success-soft)", color: "var(--success)" }}
            >
              <Check size={17} /> Выбор сохранён
            </button>
          ) : (
            <PrimaryButton
              onClick={() => {
                void saveProjectPriorities(priorities);
                setSaved(true);
              }}
              disabled={priorities.length === 0}
            >
              Сохранить выбор
            </PrimaryButton>
          )}
        </div>
      )}

      {projectResources.length > 0 && (
        <div className="px-5 pb-8">
          <SectionHeader
            title="Дополнительные ссылки"
            right={(
              data.currentUser.capabilities.canManageProjects ? (
                <ActionIconButton
                  kind="plus"
                  label="Добавить проектную ссылку"
                  onClick={(event) => {
                    event.preventDefault();
                    setAdminState({ kind: "resource", mode: "create", defaults: { category: "projects" } });
                  }}
                />
              ) : undefined
            )}
          />
          <div className="space-y-2">
            {projectResources.map((resource) => (
              <SurfaceCard key={resource.id} className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: "var(--bg-subtle)" }}>
                  <Link2 size={18} style={{ color: "var(--text-secondary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] line-clamp-1" style={{ color: "var(--text-primary)" }}>{resource.title}</p>
                  <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                    {RESOURCE_KIND_LABELS[resource.kind] ?? resource.kind}
                  </p>
                </div>
                <button onClick={() => openExternal(resource.url)} style={{ color: "var(--info)" }}>
                  <ExternalLink size={19} />
                </button>
                {data.currentUser.capabilities.canManageProjects && (
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
