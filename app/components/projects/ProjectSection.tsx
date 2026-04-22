import { Check, Users } from "lucide-react";

import { ActionIconButton } from "../admin-ui";
import type {
  AdminUser,
  Person,
  Project,
  ProjectSelectionPhase,
  ProjectTeam,
} from "../../lib/domain";
import { TeamRoster } from "./TeamRoster";

export interface ProjectSectionProps {
  project: Project;
  phase: ProjectSelectionPhase;
  priorityIndex: number;
  isMyProject: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleHidden?: () => void;
  teams?: ProjectTeam[];
  personById?: Map<string, Person | AdminUser>;
  currentUserId?: string;
  availableParticipants?: (Person | AdminUser)[];
  canManage?: boolean;
  onAddTeam?: (projectId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  onAssign?: (userId: string, teamId: string) => void;
  onUnassign?: (userId: string) => void;
}

export function ProjectSection({
  project,
  phase,
  priorityIndex,
  isMyProject,
  onToggle,
  onEdit,
  onDelete,
  onToggleHidden,
  teams,
  personById,
  currentUserId,
  availableParticipants,
  canManage,
  onAddTeam,
  onDeleteTeam,
  onAssign,
  onUnassign,
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
        {phase === "open" &&
          (selected ? (
            <div
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[14px] shrink-0"
              style={{
                background: "var(--brand)",
                color: "var(--brand-contrast)",
                fontWeight: 600,
              }}
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
          ))}
        {phase === "closed" && selected && (
          <div
            className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[14px] shrink-0"
            style={{
              background: "var(--brand-soft)",
              color: "var(--text-primary)",
              fontWeight: 600,
            }}
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

      {(phase === "closed" || phase === "results") && teams && personById && (
        <TeamRoster
          project={project}
          teams={teams}
          personById={personById}
          currentUserId={currentUserId}
          availableParticipants={availableParticipants}
          canManage={Boolean(canManage)}
          onAddTeam={onAddTeam}
          onDeleteTeam={onDeleteTeam}
          onAssign={onAssign}
          onUnassign={onUnassign}
        />
      )}
    </div>
  );
}
