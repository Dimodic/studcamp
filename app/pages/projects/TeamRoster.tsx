import { useState } from "react";

import type { AdminUser, Person, Project, ProjectTeam } from "../../lib/domain";

interface TeamRosterProps {
  project: Project;
  teams: ProjectTeam[];
  personById: Map<string, Person | AdminUser>;
  currentUserId?: string;
  availableParticipants?: (Person | AdminUser)[];
  canManage: boolean;
  onAddTeam?: (projectId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  onAssign?: (userId: string, teamId: string) => void;
  onUnassign?: (userId: string) => void;
}

export function TeamRoster({
  project,
  teams,
  personById,
  currentUserId,
  availableParticipants,
  canManage,
  onAddTeam,
  onDeleteTeam,
  onAssign,
  onUnassign,
}: TeamRosterProps) {
  const projectTeams = teams.filter((team) => team.projectId === project.id);
  const [pickerOpenTeam, setPickerOpenTeam] = useState<string | null>(null);

  const assignedElsewhere = new Set<string>();
  for (const team of teams) {
    if (team.projectId !== project.id) {
      for (const id of team.memberIds) assignedElsewhere.add(id);
    }
  }
  const currentTeamMembers = new Set(projectTeams.flatMap((team) => team.memberIds));
  const candidates = (availableParticipants ?? []).filter(
    (person) => !currentTeamMembers.has(person.id),
  );

  return (
    <div className="mt-4 rounded-[var(--radius-md)] p-4" style={{ background: "var(--bg-subtle)" }}>
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[11px] uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          Команды
        </p>
        {canManage && onAddTeam && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAddTeam(project.id);
            }}
            className="text-[12px] px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--bg-card)]"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--line-subtle)" }}
          >
            + Команда
          </button>
        )}
      </div>

      {projectTeams.length === 0 ? (
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Команд ещё нет.{" "}
          {canManage
            ? "Нажмите «Распределить по приоритетам» наверху или создайте команду вручную."
            : "Организатор ещё не распределил участников."}
        </p>
      ) : (
        <div className="space-y-3">
          {projectTeams.map((team) => {
            const isPickerOpen = pickerOpenTeam === team.id;
            const isMyTeam = currentUserId !== undefined && team.memberIds.includes(currentUserId);
            return (
              <div
                key={team.id}
                className="rounded-[var(--radius-sm)] p-3"
                style={{
                  background: "var(--bg-card)",
                  border: isMyTeam ? "1.5px solid var(--brand)" : "1px solid var(--line-subtle)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-[13px]"
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    Команда {team.number}
                    {isMyTeam && (
                      <span
                        className="ml-2 text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "var(--brand-soft)",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        Ваша
                      </span>
                    )}
                    <span
                      className="ml-2 text-[12px]"
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      {team.memberIds.length} / {project.maxTeam}
                    </span>
                  </p>
                  {canManage && onDeleteTeam && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (
                          window.confirm(
                            `Удалить команду ${team.number}? Участники вернутся в распределение.`,
                          )
                        ) {
                          onDeleteTeam(team.id);
                        }
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-full transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      удалить
                    </button>
                  )}
                </div>
                {team.memberIds.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: "var(--text-tertiary)" }}>
                    Пока пусто.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {team.memberIds.map((memberId) => {
                      const person = personById.get(memberId);
                      return (
                        <span
                          key={memberId}
                          className="text-[12.5px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                          style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                        >
                          {person?.name ?? memberId}
                          {canManage && onUnassign && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onUnassign(memberId);
                              }}
                              className="text-[11px] opacity-60 hover:opacity-100"
                              aria-label="Убрать из команды"
                              title="Убрать из команды"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
                {canManage && onAssign && (
                  <div className="mt-2">
                    {isPickerOpen ? (
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={(event) => {
                            const userId = event.target.value;
                            if (userId) onAssign(userId, team.id);
                            setPickerOpenTeam(null);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className="flex-1 text-[12.5px] rounded-[var(--radius-sm)] border px-2 py-1 outline-none"
                          style={{
                            borderColor: "var(--line-subtle)",
                            background: "var(--bg-card)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <option value="" disabled>
                            Добавить участника…
                          </option>
                          {candidates.map((candidate) => {
                            const alsoAssigned = assignedElsewhere.has(candidate.id);
                            return (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                                {alsoAssigned ? " (перенести из другой команды)" : ""}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setPickerOpenTeam(null);
                          }}
                          className="text-[12px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setPickerOpenTeam(team.id);
                        }}
                        className="text-[12.5px] transition-colors hover:text-[var(--text-primary)]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        + добавить участника
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
