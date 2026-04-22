import { useState } from "react";

import type {
  AdminUser,
  Person,
  Project,
  ProjectSelectionPhase,
  ProjectTeam,
} from "../../lib/domain";
import { MentorHeader } from "./MentorHeader";
import { PhotoLightbox } from "./PhotoLightbox";
import { ProjectSection } from "./ProjectSection";
import type { MentorGroup } from "./types";

interface MentorCardProps {
  group: MentorGroup;
  phase: ProjectSelectionPhase;
  priorities: string[];
  myProjectId?: string;
  onTogglePriority: (projectId: string) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  onToggleProjectHidden?: (project: Project) => void;
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

export function MentorCard({
  group,
  phase,
  priorities,
  myProjectId,
  onTogglePriority,
  onEditProject,
  onDeleteProject,
  onToggleProjectHidden,
  teams,
  personById,
  currentUserId,
  availableParticipants,
  canManage,
  onAddTeam,
  onDeleteTeam,
  onAssign,
  onUnassign,
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
                onToggleHidden={
                  onToggleProjectHidden ? () => onToggleProjectHidden(project) : undefined
                }
                teams={teams}
                personById={personById}
                currentUserId={currentUserId}
                availableParticipants={availableParticipants}
                canManage={canManage}
                onAddTeam={onAddTeam}
                onDeleteTeam={onDeleteTeam}
                onAssign={onAssign}
                onUnassign={onUnassign}
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
