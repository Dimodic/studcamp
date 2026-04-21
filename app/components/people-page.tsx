import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router";
import { ExternalLink, House, Mail, Search, X } from "lucide-react";
import { Avatar, EmptyState, PageShell } from "./common";
import { useAppData } from "../lib/app-data";
import type { AdminUser, Person, UserRole } from "../lib/domain";
import { ROLE_LABELS, ROLE_STYLES } from "../lib/options";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const ROLE_ORDER: Record<UserRole, number> = {
  organizer: 0,
  teacher: 1,
  participant: 2,
};

const FILTER_OPTIONS: Array<{ key: "all" | UserRole; label: string }> = [
  { key: "all", label: "Все" },
  { key: "participant", label: "Участники" },
  { key: "teacher", label: "Преподаватели" },
  { key: "organizer", label: "Организаторы" },
];

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors flex items-center gap-2"
      style={{
        background: active ? "var(--brand-soft)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--brand)" : "var(--line-subtle)"}`,
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
      <span
        className="text-[11px] px-1.5 py-0 rounded-full min-w-[20px] text-center"
        style={{
          background: active ? "var(--brand)" : "var(--bg-subtle)",
          color: active ? "var(--brand-contrast)" : "var(--text-tertiary)",
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );
}

interface PersonRowProps {
  person: Person | AdminUser;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function PersonRow({ person, onClick, onEdit, onDelete }: PersonRowProps) {
  const roleStyle = ROLE_STYLES[person.role] ?? ROLE_STYLES.participant;
  const metaParts: string[] = [];
  if (person.visibility === "name_plus_fields") {
    if (person.university) metaParts.push(person.university);
    if (person.city) metaParts.push(person.city);
  }
  const meta = metaParts.join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-3.5 rounded-[var(--radius-lg)] border transition-colors text-left hover:bg-[var(--bg-subtle)]"
      style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
    >
      <Avatar name={person.name} size={44} />
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] leading-snug truncate" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {person.name}
        </p>
        {meta ? (
          <p className="text-[12.5px] mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
            {meta}
          </p>
        ) : (
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Профиль скрыт
          </p>
        )}
      </div>
      <span
        className="text-[11.5px] px-2.5 py-1 rounded-full shrink-0"
        style={{ background: roleStyle.bg, color: roleStyle.color, fontWeight: 600 }}
      >
        {ROLE_LABELS[person.role] ?? person.role}
      </span>
      {onEdit && (
        <ActionIconButton
          kind="edit"
          label={`Редактировать ${person.name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit();
          }}
        />
      )}
      {onDelete && (
        <ActionIconButton
          kind="delete"
          label={`Удалить ${person.name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (window.confirm(`Удалить «${person.name}»? Это необратимо.`)) {
              onDelete();
            }
          }}
        />
      )}
    </button>
  );
}

export function PeoplePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity, deleteAdminEntity, setProjectAssignment } = useAppData();
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
      data && selectedPerson ? data.adminDocuments.filter((document) => document.userId === selectedPerson.id) : [],
    [data, selectedPerson],
  );
  const selectedRoomAssignment = useMemo(
    () =>
      data && selectedPerson
        ? data.adminRoomAssignments.find((assignment) => assignment.userId === selectedPerson.id) ?? null
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
    if (searchParams.get("admin") === "create-user" && data.currentUser.capabilities.canManageUsers) {
      setAdminState({ kind: "user", mode: "create" });
      navigate("/people", { replace: true });
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
      navigate("/people", { replace: true });
    }
  }, [data, location.search, navigate]);

  if (!data) return null;

  const sourcePeople = data.currentUser.capabilities.canManageUsers ? data.adminUsers : data.people;
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

      <div className="px-5 pb-5 space-y-3">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            placeholder="Найти по имени"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-[var(--radius-md)] pl-11 pr-10 py-2.5 text-[14.5px] outline-none border transition-colors focus:border-[var(--text-tertiary)]"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--line-subtle)",
              color: "var(--text-primary)",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Очистить поиск"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              count={counts[filter.key]}
              active={roleFilter === filter.key}
              onClick={() => setRoleFilter(filter.key)}
            />
          ))}
        </div>
      </div>

      <div className="px-5 pb-8 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState text={search ? `Никого не найдено по запросу «${search}»` : "Пока никого не добавили"} />
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
            setAdminState({ kind: "document", mode: "create", defaults: { userId: selectedPerson.id } })
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

interface PersonDetailsSheetProps {
  person: Person | AdminUser;
  canManageUsers: boolean;
  isSelf: boolean;
  documents: Array<{ id: string; title: string; status: string }>;
  roomAssignment: { number: string; floor: number; building: string } | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditRoom: () => void;
  onDeleteRoom: () => void;
  onCreateDocument: () => void;
  onEditDocument: (document: { id: string; title: string; status: string }) => void;
  onDeleteDocument: (document: { id: string; title: string; status: string }) => void;
  teamOptions?: Array<{ teamId: string; label: string }>;
  currentTeamId?: string | null;
  onAssignTeam?: (teamId: string | null) => void;
}

function PersonDetailsSheet({
  person,
  canManageUsers,
  isSelf,
  documents,
  roomAssignment,
  onClose,
  onEdit,
  onDelete,
  onEditRoom,
  onDeleteRoom,
  onCreateDocument,
  onEditDocument,
  onDeleteDocument,
  teamOptions,
  currentTeamId,
  onAssignTeam,
}: PersonDetailsSheetProps) {
  const roleStyle = ROLE_STYLES[person.role] ?? ROLE_STYLES.participant;
  const hasDetails =
    person.visibility === "name_plus_fields" &&
    (person.university || person.city || person.telegram || ("email" in person && person.email));

  const telegramLink = person.telegram?.startsWith("@")
    ? `https://t.me/${person.telegram.slice(1)}`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-floating)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full mx-auto mt-3" style={{ background: "var(--line-strong)" }} />

        <div className="px-6 pt-5 pb-5 flex items-start gap-4 border-b" style={{ borderColor: "var(--line-subtle)" }}>
          <Avatar name={person.name} size={68} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] leading-tight mb-1" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {person.name}
            </h2>
            <span
              className="inline-block text-[12px] px-2.5 py-1 rounded-full"
              style={{ background: roleStyle.bg, color: roleStyle.color, fontWeight: 600 }}
            >
              {ROLE_LABELS[person.role] ?? person.role}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {canManageUsers && (
              <ActionIconButton
                kind="edit"
                label="Редактировать пользователя"
                onClick={(event) => {
                  event.preventDefault();
                  onEdit();
                }}
              />
            )}
            {canManageUsers && !isSelf && (
              <ActionIconButton
                kind="delete"
                label="Удалить пользователя"
                onClick={(event) => {
                  event.preventDefault();
                  if (window.confirm(`Удалить «${person.name}»? Это необратимо.`)) {
                    onDelete();
                  }
                }}
              />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {hasDetails ? (
            <dl
              className="grid gap-3 text-[14px]"
              style={{ gridTemplateColumns: "max-content 1fr" } as CSSProperties}
            >
              {person.university && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>ВУЗ</dt>
                  <dd className="m-0" style={{ color: "var(--text-primary)" }}>{person.university}</dd>
                </>
              )}
              {person.city && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>Город</dt>
                  <dd className="m-0" style={{ color: "var(--text-primary)" }}>{person.city}</dd>
                </>
              )}
              {person.telegram && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>Telegram</dt>
                  <dd className="m-0">
                    {telegramLink ? (
                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1"
                        style={{ color: "var(--info)" }}
                      >
                        {person.telegram}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-primary)" }}>{person.telegram}</span>
                    )}
                  </dd>
                </>
              )}
              {"email" in person && person.email && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>Email</dt>
                  <dd className="m-0 flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                    <Mail size={13} style={{ color: "var(--text-tertiary)" }} />
                    {person.email}
                  </dd>
                </>
              )}
              {"isActive" in person && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>Активен</dt>
                  <dd className="m-0" style={{ color: person.isActive ? "var(--success)" : "var(--text-tertiary)" }}>
                    {person.isActive ? "Да" : "Нет"}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>
              Профиль скрыт участником. Отображается только ФИО.
            </p>
          )}

          {canManageUsers && person.role === "participant" && teamOptions && onAssignTeam && (
            <div>
              <p
                className="text-[11px] uppercase tracking-wider mb-2"
                style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
              >
                Проект / команда
              </p>
              <select
                value={currentTeamId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  onAssignTeam(value === "" ? null : value);
                }}
                className="w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-[14px] outline-none"
                style={{ borderColor: "var(--line-subtle)", background: "var(--bg-input)", color: "var(--text-primary)" }}
              >
                <option value="">— не назначен —</option>
                {teamOptions.map((option) => (
                  <option key={option.teamId} value={option.teamId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canManageUsers && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                  >
                    Заселение
                  </p>
                  <div className="flex items-center gap-1.5">
                    <ActionIconButton
                      kind={roomAssignment ? "edit" : "plus"}
                      label={roomAssignment ? "Редактировать заселение" : "Добавить заселение"}
                      onClick={(event) => {
                        event.preventDefault();
                        onEditRoom();
                      }}
                    />
                    {roomAssignment && (
                      <ActionIconButton
                        kind="delete"
                        label="Удалить заселение"
                        onClick={(event) => {
                          event.preventDefault();
                          if (window.confirm("Удалить заселение?")) {
                            onDeleteRoom();
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
                {roomAssignment ? (
                  <div
                    className="flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] border"
                    style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                    >
                      <House size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        Комната {roomAssignment.number}, этаж {roomAssignment.floor}
                      </p>
                      <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {roomAssignment.building}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>
                    Заселение ещё не задано.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                  >
                    Документы
                  </p>
                  <ActionIconButton
                    kind="plus"
                    label="Добавить документ"
                    onClick={(event) => {
                      event.preventDefault();
                      onCreateDocument();
                    }}
                  />
                </div>
                {documents.length === 0 ? (
                  <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>
                    Документов пока нет.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] border"
                        style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                            {document.title}
                          </p>
                          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                            {document.status}
                          </p>
                        </div>
                        <ActionIconButton
                          kind="edit"
                          label="Редактировать документ"
                          onClick={(event) => {
                            event.preventDefault();
                            onEditDocument(document);
                          }}
                        />
                        <ActionIconButton
                          kind="delete"
                          label="Удалить документ"
                          onClick={(event) => {
                            event.preventDefault();
                            if (window.confirm(`Удалить документ «${document.title}»?`)) {
                              onDeleteDocument(document);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
