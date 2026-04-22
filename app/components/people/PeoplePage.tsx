import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { EmptyState, PageShell } from "../common";
import { useAppData } from "../../lib/app-data";
import type { AdminUser, Person, UserRole } from "../../lib/domain";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "../admin-ui";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { ROLE_ORDER } from "./constants";
import { PeopleFilters } from "./PeopleFilters";
import { PersonDetailsSheet } from "./PersonDetailsSheet";
import { PersonRow } from "./PersonRow";

export function PeoplePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity, deleteAdminEntity, setProjectAssignment } =
    useAppData();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [selectedPerson, setSelectedPerson] = useState<Person | AdminUser | null>(null);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);
  useBodyScrollLock(Boolean(selectedPerson));

  const selectedDocs = useMemo(
    () =>
      data && selectedPerson
        ? data.adminDocuments.filter((document) => document.userId === selectedPerson.id)
        : [],
    [data, selectedPerson],
  );
  const selectedRoomAssignment = useMemo(
    () =>
      data && selectedPerson
        ? (data.adminRoomAssignments.find(
            (assignment) => assignment.userId === selectedPerson.id,
          ) ?? null)
        : null,
    [data, selectedPerson],
  );
  const teamOptions = useMemo(() => {
    if (!data) return [];
    const projectById = new Map(data.projects.map((project) => [project.id, project.title]));
    return data.projectTeams.map((team) => ({
      teamId: team.id,
      label: `${projectById.get(team.projectId) ?? team.projectId} · Команда ${team.number}`,
    }));
  }, [data]);
  const selectedUserTeamId = useMemo(() => {
    if (!data || !selectedPerson) return null;
    const team = data.projectTeams.find((team) => team.memberIds.includes(selectedPerson.id));
    return team?.id ?? null;
  }, [data, selectedPerson]);

  useEffect(() => {
    if (!data) return;
    const searchParams = new URLSearchParams(location.search);
    if (
      searchParams.get("admin") === "create-user" &&
      data.currentUser.capabilities.canManageUsers
    ) {
      setAdminState({ kind: "user", mode: "create" });
      void navigate("/people", { replace: true });
    }
    const userId = searchParams.get("user");
    if (userId) {
      const target =
        (data.currentUser.capabilities.canManageUsers ? data.adminUsers : data.people).find(
          (person) => person.id === userId,
        ) ?? data.people.find((person) => person.id === userId);
      if (target) {
        setSelectedPerson(target);
      }
      void navigate("/people", { replace: true });
    }
  }, [data, location.search, navigate]);

  // ── Derived state — считаем до ранних return, чтобы хуки были стабильны.
  const sourcePeople = data
    ? data.currentUser.capabilities.canManageUsers
      ? data.adminUsers
      : data.people
    : [];
  const counts = useMemo(() => {
    const result = { all: sourcePeople.length, participant: 0, teacher: 0, organizer: 0 };
    for (const person of sourcePeople) {
      if (person.role === "participant") result.participant += 1;
      else if (person.role === "teacher") result.teacher += 1;
      else if (person.role === "organizer") result.organizer += 1;
    }
    return result;
  }, [sourcePeople]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = sourcePeople
      .filter((person) => {
        const matchesSearch = !query || person.name.toLowerCase().includes(query);
        const matchesRole = roleFilter === "all" || person.role === roleFilter;
        return matchesSearch && matchesRole;
      })
      .slice()
      .sort((left, right) => {
        const roleDiff = ROLE_ORDER[left.role] - ROLE_ORDER[right.role];
        if (roleDiff !== 0) return roleDiff;
        return left.name.localeCompare(right.name, "ru");
      });
    return list;
  }, [sourcePeople, roleFilter, search]);

  if (!data) return null;

  const userOptions = data.adminUsers.map((user) => ({ id: user.id, label: user.name }));

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-primary)]">Люди</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            {counts.all} человек в кемпе
          </p>
        </div>
        {data.currentUser.capabilities.canManageUsers && (
          <ActionIconButton
            kind="plus"
            label="Создать пользователя"
            onClick={(event) => {
              event.preventDefault();
              setAdminState({ kind: "user", mode: "create" });
            }}
          />
        )}
      </div>

      <PeopleFilters
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        counts={counts}
      />

      <div className="px-5 pb-8 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            text={search ? `Никого не найдено по запросу «${search}»` : "Пока никого не добавили"}
          />
        ) : (
          filtered.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              onClick={() => setSelectedPerson(person)}
              onEdit={
                data.currentUser.capabilities.canManageUsers
                  ? () => setAdminState({ kind: "user", mode: "edit", entity: person })
                  : undefined
              }
              onDelete={
                data.currentUser.capabilities.canManageUsers && person.id !== data.currentUser.id
                  ? () => void deleteAdminEntity("users", person.id)
                  : undefined
              }
            />
          ))
        )}
      </div>

      {selectedPerson && (
        <PersonDetailsSheet
          person={selectedPerson}
          canManageUsers={data.currentUser.capabilities.canManageUsers}
          isSelf={selectedPerson.id === data.currentUser.id}
          documents={selectedDocs}
          roomAssignment={selectedRoomAssignment}
          onClose={() => setSelectedPerson(null)}
          onEdit={() => setAdminState({ kind: "user", mode: "edit", entity: selectedPerson })}
          onDelete={async () => {
            await deleteAdminEntity("users", selectedPerson.id);
            setSelectedPerson(null);
          }}
          onEditRoom={() =>
            setAdminState({
              kind: "roomAssignment",
              mode: selectedRoomAssignment ? "edit" : "create",
              entity: selectedRoomAssignment ?? undefined,
              defaults: { userId: selectedPerson.id },
            })
          }
          onDeleteRoom={() => void deleteAdminEntity("room-assignments", selectedPerson.id)}
          onCreateDocument={() =>
            setAdminState({
              kind: "document",
              mode: "create",
              defaults: { userId: selectedPerson.id },
            })
          }
          onEditDocument={(document) =>
            setAdminState({ kind: "document", mode: "edit", entity: document })
          }
          onDeleteDocument={(document) => void deleteAdminEntity("documents", document.id)}
          teamOptions={teamOptions}
          currentTeamId={selectedUserTeamId}
          onAssignTeam={(teamId) => void setProjectAssignment(selectedPerson.id, teamId)}
        />
      )}

      <AdminEditorModal
        open={adminState !== null}
        kind={adminState?.kind ?? null}
        mode={adminState?.mode ?? "create"}
        entity={adminState?.entity}
        defaults={adminState?.defaults}
        userOptions={userOptions}
        onClose={() => setAdminState(null)}
        onSubmit={async (payload) => {
          if (!adminState) return;
          const resource = ADMIN_PATHS[adminState.kind];
          if (adminState.mode === "create") {
            await createAdminEntity(resource, payload);
            return;
          }
          const entityId =
            adminState.kind === "roomAssignment"
              ? (adminState.entity as { userId: string }).userId
              : (adminState.entity as { id: string }).id;
          await updateAdminEntity(resource, entityId, payload);
        }}
      />
    </PageShell>
  );
}
