import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { PageShell } from "../common";
import { useAppData } from "../../lib/app-data";
import type { Project, ProjectSelectionPhase } from "../../lib/domain";
import { ADMIN_PATHS, AdminEditorModal, ActionIconButton, type AdminEntityKind } from "../admin-ui";
import { EmptyState } from "./EmptyState";
import { MentorCard } from "./MentorCard";
import { PhaseBanner } from "./PhaseBanner";
import { PHASE_OPTIONS } from "./constants";
import { groupProjectsByMentor, mentorProfileFromProject, type MentorGroup } from "./types";

export function ProjectsPage() {
  const {
    data,
    saveProjectPriorities,
    createAdminEntity,
    updateAdminEntity,
    deleteAdminEntity,
    setEntityVisibility,
    setProjectPhase,
    createProjectTeam,
    deleteProjectTeam,
    setProjectAssignment,
    autoDistributeAssignments,
  } = useAppData();
  const [priorities, setPriorities] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    if (data) {
      setPriorities(data.projectPriorities);
    }
  }, [data]);

  if (!data) {
    return null;
  }

  const phase = data.projectSelectionPhase;
  const allProjects = data.projects;
  const eventOptions = data.events.map((event) => ({
    id: event.id,
    label: `${event.title} · ${event.date}`,
  }));
  const canManage = data.currentUser.capabilities.canManageProjects;
  const isParticipant = data.currentUser.role === "participant";
  const teams = data.projectTeams ?? [];
  const participantPool = data.adminUsers.length > 0 ? data.adminUsers : data.people;
  const participantUsers = participantPool.filter((person) => person.role === "participant");
  const personById = new Map(participantPool.map((person) => [person.id, person]));

  const isPriorityView = isParticipant && phase === "closed" && priorities.length > 0;
  const availableProjects = isPriorityView
    ? priorities
        .map((id) => allProjects.find((project) => project.id === id))
        .filter((project): project is Project => Boolean(project))
    : allProjects;

  // В results у участника «мой проект» — тот, к команде которого он привязан.
  const assignedTeamId = data.currentUser.assignedTeamId ?? null;
  const assignedTeam = assignedTeamId
    ? teams.find((team) => team.id === assignedTeamId)
    : undefined;
  const myProjectId = isParticipant && phase === "results" ? assignedTeam?.projectId : undefined;
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
      onEditProject={
        canManage
          ? (project) => setAdminState({ kind: "project", mode: "edit", entity: project })
          : undefined
      }
      onDeleteProject={
        canManage ? (project) => void deleteAdminEntity("projects", project.id) : undefined
      }
      onToggleProjectHidden={
        canManage
          ? (project) => void setEntityVisibility("projects", project.id, !project.isHidden)
          : undefined
      }
      teams={teams}
      personById={personById}
      currentUserId={data.currentUser.id}
      availableParticipants={canManage ? participantUsers : undefined}
      canManage={canManage}
      onAddTeam={canManage ? (projectId) => void createProjectTeam(projectId) : undefined}
      onDeleteTeam={canManage ? (teamId) => void deleteProjectTeam(teamId) : undefined}
      onAssign={
        canManage ? (userId, teamId) => void setProjectAssignment(userId, teamId) : undefined
      }
      onUnassign={canManage ? (userId) => void setProjectAssignment(userId, null) : undefined}
    />
  );

  const isEmpty = availableProjects.length === 0;

  const handleSetPhase = async (next: ProjectSelectionPhase) => {
    if (next === phase || phaseBusy) return;
    setPhaseBusy(true);
    try {
      await setProjectPhase(next);
    } finally {
      setPhaseBusy(false);
    }
  };

  const handleAutoDistribute = async () => {
    if (distributing) return;
    setDistributing(true);
    try {
      const result = await autoDistributeAssignments();
      if (result.unassigned.length > 0) {
        window.alert(
          `Распределено: ${result.assigned}. Не распределены (нет приоритетов или мест): ${result.unassigned.length}.`,
        );
      } else {
        window.alert(
          `Распределено: ${result.assigned}. Все участники с приоритетами получили команду.`,
        );
      }
    } finally {
      setDistributing(false);
    }
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

      {canManage && (
        <div className="px-5 mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="text-[11px] uppercase tracking-wider shrink-0"
              style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
            >
              Фаза
            </span>
            <div
              className="flex-1 flex gap-1 p-1 rounded-full overflow-x-auto"
              style={{ background: "var(--bg-subtle)" }}
            >
              {PHASE_OPTIONS.map((option) => {
                const active = phase === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={phaseBusy || active}
                    onClick={() => void handleSetPhase(option.value)}
                    className="flex-1 min-w-max text-[13px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                    style={{
                      background: active ? "var(--bg-card)" : "transparent",
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: active ? 600 : 500,
                      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      opacity: phaseBusy && !active ? 0.5 : 1,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          {(phase === "closed" || phase === "results") && (
            <button
              type="button"
              onClick={() => void handleAutoDistribute()}
              disabled={distributing}
              className="w-full sm:w-auto shrink-0 text-[13px] px-4 py-2 rounded-full transition-colors"
              style={{
                background: "var(--accent-peach)",
                color: "var(--text-primary)",
                fontWeight: 600,
                opacity: distributing ? 0.6 : 1,
              }}
            >
              {distributing ? "Распределяю…" : "↻ Распределить по приоритетам"}
            </button>
          )}
        </div>
      )}

      <div className="px-5 mb-4">
        <PhaseBanner phase={phase} selectedCount={priorities.length} />
      </div>

      {isEmpty ? (
        <div className="px-5 pb-8">
          <EmptyState
            canManage={canManage}
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
              <span
                className="flex items-center gap-2 text-[13px]"
                style={{ color: "var(--text-tertiary)" }}
              >
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
              <div className="mt-4 space-y-4">{otherGroups.map(renderMentorCard)}</div>
            )}
          </div>
        </>
      ) : (
        <div className="px-5 pb-8 space-y-4">{otherGroups.map(renderMentorCard)}</div>
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
                style={{
                  background: "var(--success-soft)",
                  color: "var(--success)",
                  fontWeight: 600,
                }}
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
                style={{
                  background: "var(--brand)",
                  color: "var(--brand-contrast)",
                  fontWeight: 600,
                }}
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
