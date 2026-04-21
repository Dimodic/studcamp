import { useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FolderKanban,
  Hourglass,
  Sparkles,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, PageShell, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import type { Project, ProjectSelectionPhase } from "../lib/domain";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

const PHASE_COPY: Record<
  ProjectSelectionPhase,
  { icon: LucideIcon; accent: string; title: string; description: string }
> = {
  countdown: {
    icon: Hourglass,
    accent: "var(--info)",
    title: "Выбор скоро откроется",
    description: "Следите за орг-обновлениями и заранее посмотрите карточки проектов.",
  },
  open: {
    icon: Sparkles,
    accent: "var(--warning)",
    title: "Расставьте приоритеты",
    description: "Выберите до 5 проектов в порядке важности и сохраните выбор.",
  },
  closed: {
    icon: Check,
    accent: "var(--success)",
    title: "Выбор проектов завершён",
    description: "Ваши приоритеты отправлены. Организаторы распределяют участников по проектам.",
  },
  results: {
    icon: Trophy,
    accent: "var(--brand-contrast)",
    title: "Результаты опубликованы",
    description: "Ниже — карточка вашего ментора с проектами, остальные менторы как справочник.",
  },
};

function PhaseBanner({ phase, selectedCount }: { phase: ProjectSelectionPhase; selectedCount: number }) {
  const copy = PHASE_COPY[phase];
  const Icon = copy.icon;
  const isOpen = phase === "open";
  const isResults = phase === "results";
  const tileBackground = isResults
    ? "var(--brand)"
    : `color-mix(in srgb, ${copy.accent} 14%, transparent)`;
  const tileColor = isResults ? "var(--brand-contrast)" : copy.accent;

  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ background: tileBackground, color: tileColor } as CSSProperties}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {copy.title}
          </p>
          <p className="text-[13.5px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {copy.description}
          </p>
          {isOpen && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  Выбрано
                </span>
                <span className="text-[13px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {selectedCount} / 5
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(selectedCount, 5) * 20}%`,
                    background: "var(--brand)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function EmptyProjectsState({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <SurfaceCard className="py-14 px-6">
      <div className="flex flex-col items-center max-w-md mx-auto text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{
            background: "color-mix(in srgb, var(--text-tertiary) 10%, transparent)",
            color: "var(--text-tertiary)",
          }}
        >
          <FolderKanban size={24} />
        </div>
        <p className="text-[16px] mb-1.5" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          Проекты ещё не опубликованы
        </p>
        <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Как только организаторы добавят проекты, они появятся здесь. Подпишитесь на уведомления,
          чтобы не пропустить анонс.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] px-4 py-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--brand-hover)]"
            style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 600 }}
          >
            Создать первый проект
          </button>
        )}
      </div>
    </SurfaceCard>
  );
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function PhotoLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.85)" }}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255, 255, 255, 0.12)", color: "white" }}
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full rounded-[var(--radius-lg)]"
        style={{ objectFit: "contain" }}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

interface MentorProfile {
  name: string;
  position: string | null;
  city: string | null;
  telegram: string | null;
  photo: string | null;
  workFormat: string | null;
}

interface MentorGroup {
  key: string;
  mentor: MentorProfile | null;
  projects: Project[];
}

function mentorProfileFromProject(project: Project): MentorProfile | null {
  if (!project.mentorName) {
    return null;
  }
  return {
    name: project.mentorName,
    position: project.mentorPosition ?? null,
    city: project.mentorCity ?? null,
    telegram: project.mentorTelegram ?? null,
    photo: project.mentorPhoto ?? null,
    workFormat: project.mentorWorkFormat ?? null,
  };
}

function groupProjectsByMentor(projects: Project[]): MentorGroup[] {
  const byKey = new Map<string, MentorGroup>();
  const noMentorKey = "__no_mentor__";

  for (const project of projects) {
    const key = project.mentorName?.trim() || noMentorKey;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        mentor: mentorProfileFromProject(project),
        projects: [],
      };
      byKey.set(key, group);
    }
    group.projects.push(project);
  }

  return [...byKey.values()];
}

function MentorHeader({
  mentor,
  onPhotoClick,
  projectsCount,
}: {
  mentor: MentorProfile;
  onPhotoClick?: () => void;
  projectsCount: number;
}) {
  const telegramLink = mentor.telegram?.startsWith("@")
    ? `https://t.me/${mentor.telegram.slice(1)}`
    : undefined;

  const photoNode = mentor.photo ? (
    <img
      src={mentor.photo}
      alt={mentor.name}
      className="w-full h-full object-cover object-top"
    />
  ) : (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "var(--bg-subtle)" }}
    >
      <Avatar name={mentor.name} size={72} />
    </div>
  );

  return (
    <div className="flex gap-4 sm:gap-5 p-5 sm:p-6">
      <button
        type="button"
        onClick={onPhotoClick}
        aria-label={`Открыть фото ментора ${mentor.name}`}
        className="shrink-0 overflow-hidden transition-transform hover:scale-[1.02]"
        style={{
          width: 80,
          height: 80,
          borderRadius: "var(--radius-md)",
          background: "var(--bg-subtle)",
        }}
      >
        {photoNode}
      </button>

      <div className="flex-1 min-w-0 pt-0.5">
        <p
          className="text-[10px] uppercase tracking-wider mb-1"
          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          Ментор · {projectsCount} {projectsCount === 1 ? "проект" : projectsCount < 5 ? "проекта" : "проектов"}
        </p>
        <p
          className="text-[16px] leading-tight mb-1"
          style={{ color: "var(--text-primary)", fontWeight: 600 }}
        >
          {mentor.name}
        </p>
        {mentor.position && (
          <p className="text-[13px] leading-snug mb-2" style={{ color: "var(--text-secondary)" }}>
            {mentor.position}
          </p>
        )}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {mentor.city && <span>{mentor.city}</span>}
          {mentor.telegram && (
            <>
              {mentor.city && <span aria-hidden="true">·</span>}
              {telegramLink ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openExternal(telegramLink);
                  }}
                  className="inline-flex items-center gap-1 transition-opacity hover:opacity-80"
                  style={{ color: "var(--info)" }}
                >
                  {mentor.telegram}
                  <ExternalLink size={11} />
                </button>
              ) : (
                <span>{mentor.telegram}</span>
              )}
            </>
          )}
          {mentor.workFormat && (
            <>
              {(mentor.city || mentor.telegram) && <span aria-hidden="true">·</span>}
              <span>{mentor.workFormat}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProjectSectionProps {
  project: Project;
  phase: ProjectSelectionPhase;
  priorityIndex: number;
  isMyProject: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleHidden?: () => void;
}

function ProjectSection({
  project,
  phase,
  priorityIndex,
  isMyProject,
  onToggle,
  onEdit,
  onDelete,
  onToggleHidden,
}: ProjectSectionProps) {
  const selected = priorityIndex >= 0;
  const isInteractive = phase === "open" && Boolean(onToggle);
  const paragraphs = (project.description ?? project.shortDescription)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div
      className={`relative p-5 sm:p-6 ${isInteractive ? "cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]" : ""}`}
      style={{ background: isMyProject ? "var(--brand-soft)" : "transparent" }}
      onClick={isInteractive ? onToggle : undefined}
    >
      <div className="flex items-start gap-3">
        {phase === "open" && (
          selected ? (
            <div
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[14px] shrink-0"
              style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 600 }}
            >
              {priorityIndex + 1}
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
              style={{ background: "var(--bg-subtle)" }}
            >
              <span className="text-[18px] leading-none" style={{ color: "var(--text-tertiary)" }}>
                +
              </span>
            </div>
          )
        )}
        {phase === "closed" && selected && (
          <div
            className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[14px] shrink-0"
            style={{ background: "var(--brand-soft)", color: "var(--text-primary)", fontWeight: 600 }}
          >
            {priorityIndex + 1}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3
              className="text-[17px] leading-snug"
              style={{ color: "var(--text-primary)", fontWeight: 600 }}
            >
              {project.title}
            </h3>
            {isMyProject && (
              <span
                className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--brand)",
                  color: "var(--brand-contrast)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                <Check size={11} strokeWidth={3} />
                Ваш проект
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-3 text-[13px] flex-wrap mt-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span
              className="px-2 py-0.5 rounded-[var(--radius-sm)]"
              style={{ background: isMyProject ? "var(--bg-card)" : "var(--bg-subtle)" }}
            >
              {project.direction}
            </span>
            <span className="flex items-center gap-1">
              <Users size={13} />{" "}
              {project.minTeam === project.maxTeam
                ? project.minTeam
                : `${project.minTeam}–${project.maxTeam}`}
            </span>
          </div>
        </div>
        {onEdit && (
          <ActionIconButton
            kind="edit"
            label={`Редактировать ${project.title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit();
            }}
          />
        )}
        {onToggleHidden && (
          <ActionIconButton
            kind={project.isHidden ? "show" : "hide"}
            label={project.isHidden ? "Показать участникам" : "Скрыть от участников"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleHidden();
            }}
          />
        )}
        {onDelete && (
          <ActionIconButton
            kind="delete"
            label={`Удалить ${project.title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (window.confirm(`Удалить проект «${project.title}»?`)) {
                onDelete();
              }
            }}
          />
        )}
      </div>

      {paragraphs.length > 0 && (
        <div className="mt-4 space-y-3">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-[14px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

interface MentorCardProps {
  group: MentorGroup;
  phase: ProjectSelectionPhase;
  priorities: string[];
  myProjectId?: string;
  onTogglePriority: (projectId: string) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  onToggleProjectHidden?: (project: Project) => void;
}

function MentorCard({
  group,
  phase,
  priorities,
  myProjectId,
  onTogglePriority,
  onEditProject,
  onDeleteProject,
  onToggleProjectHidden,
}: MentorCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasMyProject = group.projects.some((project) => project.id === myProjectId);
  const hasAnySelected = group.projects.some((project) => priorities.includes(project.id));

  const borderColor = hasMyProject || hasAnySelected ? "var(--brand)" : "var(--line-subtle)";
  const borderWidth = hasMyProject ? 2 : hasAnySelected ? 2 : 1;

  return (
    <>
      <article
        className="rounded-[var(--radius-lg)] overflow-hidden transition-colors"
        style={{
          background: "var(--bg-card)",
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: hasMyProject ? "var(--shadow-card)" : "none",
        }}
      >
        {group.mentor ? (
          <MentorHeader
            mentor={group.mentor}
            onPhotoClick={group.mentor.photo ? () => setLightboxOpen(true) : undefined}
            projectsCount={group.projects.length}
          />
        ) : (
          <div className="px-5 sm:px-6 pt-5 sm:pt-6">
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
            >
              Без ментора · {group.projects.length}
            </p>
          </div>
        )}

        <div className="h-px w-full" style={{ background: "var(--line-subtle)" }} />

        <div className="divide-y" style={{ borderColor: "var(--line-subtle)" }}>
          {group.projects.map((project, index) => (
            <div
              key={project.id}
              className={index === 0 ? "" : "border-t"}
              style={{ borderColor: "var(--line-subtle)" }}
            >
              <ProjectSection
                project={project}
                phase={phase}
                priorityIndex={priorities.indexOf(project.id)}
                isMyProject={project.id === myProjectId}
                onToggle={phase === "open" ? () => onTogglePriority(project.id) : undefined}
                onEdit={onEditProject ? () => onEditProject(project) : undefined}
                onDelete={onDeleteProject ? () => onDeleteProject(project) : undefined}
                onToggleHidden={onToggleProjectHidden ? () => onToggleProjectHidden(project) : undefined}
              />
            </div>
          ))}
        </div>
      </article>

      {lightboxOpen && group.mentor?.photo && (
        <PhotoLightbox
          src={group.mentor.photo}
          alt={group.mentor.name}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

const DEV_PHASES: ProjectSelectionPhase[] = ["countdown", "open", "closed", "results"];

export function ProjectsPage() {
  const {
    data,
    saveProjectPriorities,
    createAdminEntity,
    updateAdminEntity,
    deleteAdminEntity,
    setEntityVisibility,
  } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [priorities, setPriorities] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
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

  const devPhaseParam = searchParams.get("dev-phase");
  const devPhase = DEV_PHASES.includes(devPhaseParam as ProjectSelectionPhase)
    ? (devPhaseParam as ProjectSelectionPhase)
    : null;
  const devEmpty = searchParams.get("dev-empty") === "1";
  const isDevOverrideActive = import.meta.env.DEV && (devPhase !== null || devEmpty);

  const phase = (devPhase ?? (data.projectSelectionPhase as ProjectSelectionPhase));
  const allProjects = devEmpty ? [] : data.projects;
  const eventOptions = data.events.map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));
  const canManage = data.currentUser.capabilities.canManageProjects;
  const isParticipant = data.currentUser.role === "participant";

  const isPriorityView = isParticipant && phase === "closed" && priorities.length > 0;
  const availableProjects = isPriorityView
    ? (priorities
        .map((id) => allProjects.find((project) => project.id === id))
        .filter((project): project is Project => Boolean(project)))
    : allProjects;

  const myProjectId = isParticipant && phase === "results" ? priorities[0] : undefined;
  const myProject = myProjectId
    ? availableProjects.find((project) => project.id === myProjectId)
    : undefined;

  const myGroup: MentorGroup | undefined = myProject
    ? {
        key: `my-${myProject.id}`,
        mentor: mentorProfileFromProject(myProject),
        projects: [myProject],
      }
    : undefined;

  const restProjects = myProject
    ? availableProjects.filter((project) => project.id !== myProject.id)
    : availableProjects;
  const otherGroups = groupProjectsByMentor(restProjects);
  const otherProjectsCount = restProjects.length;

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

  const renderMentorCard = (group: MentorGroup) => (
    <MentorCard
      key={group.key}
      group={group}
      phase={phase}
      priorities={priorities}
      myProjectId={myProjectId}
      onTogglePriority={togglePriority}
      onEditProject={canManage ? (project) => setAdminState({ kind: "project", mode: "edit", entity: project }) : undefined}
      onDeleteProject={canManage ? (project) => void deleteAdminEntity("projects", project.id) : undefined}
      onToggleProjectHidden={
        canManage
          ? (project) => void setEntityVisibility("projects", project.id, !project.isHidden)
          : undefined
      }
    />
  );

  const isEmpty = availableProjects.length === 0;

  const updateDevOverride = (key: "dev-phase" | "dev-empty", value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
        <h1 className="text-[var(--text-primary)]">Проекты</h1>
        {canManage && (
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

      {import.meta.env.DEV && (
        <div className="px-5 mb-3">
          <div
            className="flex items-center flex-wrap gap-2 p-2 rounded-[var(--radius-md)] border border-dashed"
            style={{ borderColor: "var(--line-subtle)", background: "var(--bg-card)" }}
          >
            <span
              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--radius-sm)]"
              style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 700 }}
            >
              DEV
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              Превью:
            </span>
            {DEV_PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => updateDevOverride("dev-phase", devPhase === p ? null : p)}
                className="text-[12px] px-2.5 py-1 rounded-full transition-colors"
                style={{
                  background: devPhase === p ? "var(--brand-soft)" : "transparent",
                  color: devPhase === p ? "var(--text-primary)" : "var(--text-secondary)",
                  border: `1px solid ${devPhase === p ? "var(--brand)" : "var(--line-subtle)"}`,
                  fontWeight: devPhase === p ? 600 : 500,
                }}
              >
                {PHASE_COPY[p].title.toLowerCase().split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
            <button
              type="button"
              onClick={() => updateDevOverride("dev-empty", devEmpty ? null : "1")}
              className="text-[12px] px-2.5 py-1 rounded-full transition-colors"
              style={{
                background: devEmpty ? "var(--brand-soft)" : "transparent",
                color: devEmpty ? "var(--text-primary)" : "var(--text-secondary)",
                border: `1px solid ${devEmpty ? "var(--brand)" : "var(--line-subtle)"}`,
                fontWeight: devEmpty ? 600 : 500,
              }}
            >
              пусто
            </button>
            {isDevOverrideActive && (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("dev-phase");
                  next.delete("dev-empty");
                  setSearchParams(next, { replace: true });
                }}
                className="ml-auto text-[12px] flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: "var(--text-tertiary)" }}
                aria-label="Сбросить превью"
                title="Сбросить превью"
              >
                <X size={12} /> сброс
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-5 mb-4">
        <PhaseBanner phase={phase} selectedCount={priorities.length} />
      </div>

      {isEmpty ? (
        <div className="px-5 pb-8">
          <EmptyProjectsState
            canManage={canManage && !devEmpty}
            onCreate={() => setAdminState({ kind: "project", mode: "create" })}
          />
        </div>
      ) : myGroup ? (
        <>
          <div className="px-5 pb-4">{renderMentorCard(myGroup)}</div>

          <div className="px-5 pb-8">
            <button
              type="button"
              onClick={() => setAllExpanded((value) => !value)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-md)] border transition-colors"
              style={{
                borderColor: "var(--line-subtle)",
                background: allExpanded ? "var(--bg-subtle)" : "var(--bg-card)",
                color: "var(--text-primary)",
              }}
              aria-expanded={allExpanded}
            >
              <span className="text-[14px]" style={{ fontWeight: 500 }}>
                {allExpanded ? "Скрыть остальные проекты" : "Показать остальные проекты"}
              </span>
              <span className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                {otherProjectsCount}
                <ChevronDown
                  size={16}
                  style={{
                    transition: "transform 0.2s ease",
                    transform: allExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </span>
            </button>

            {allExpanded && (
              <div className="mt-4 space-y-4">
                {otherGroups.map(renderMentorCard)}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="px-5 pb-8 space-y-4">
          {otherGroups.map(renderMentorCard)}
        </div>
      )}

      {phase === "open" && !myGroup && !isEmpty && (
        <div className="sticky bottom-4 z-20 px-5 pt-4 flex justify-center pointer-events-none">
          <div
            className="pointer-events-auto flex items-center gap-3 pl-5 pr-2 py-2 rounded-full"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--line-subtle)",
              boxShadow: "var(--shadow-floating)",
            }}
          >
            <span
              className="text-[13px] whitespace-nowrap"
              style={{ color: "var(--text-secondary)", fontWeight: 500 }}
            >
              Выбрано{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                {priorities.length}
              </span>{" "}
              из 5
            </span>
            {saved ? (
              <span
                className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-full"
                style={{ background: "var(--success-soft)", color: "var(--success)", fontWeight: 600 }}
              >
                <Check size={14} /> Сохранено
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void saveProjectPriorities(priorities);
                  setSaved(true);
                }}
                disabled={priorities.length === 0}
                className="text-[13px] px-5 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--brand-hover)]"
                style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 600 }}
              >
                Сохранить
              </button>
            )}
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
