import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Search, ExternalLink, Mail, House } from "lucide-react";
import { Avatar, EmptyState, PageShell, RoleBadge, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import type { AdminUser, Person } from "../lib/domain";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

export function PeoplePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity } = useAppData();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedPerson, setSelectedPerson] = useState<Person | AdminUser | null>(null);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);

  const selectedDocs = useMemo(
    () => (data && selectedPerson ? data.adminDocuments.filter((document) => document.userId === selectedPerson.id) : []),
    [data, selectedPerson],
  );
  const selectedRoomAssignment = useMemo(
    () => (data && selectedPerson ? data.adminRoomAssignments.find((assignment) => assignment.userId === selectedPerson.id) ?? null : null),
    [data, selectedPerson],
  );

  useEffect(() => {
    if (!data) {
      return;
    }
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("admin") === "create-user" && data.currentUser.capabilities.canManageUsers) {
      setAdminState({ kind: "user", mode: "create" });
      navigate("/people", { replace: true });
    }
  }, [data, location.search, navigate]);

  if (!data) {
    return null;
  }

  const sourcePeople = data.currentUser.capabilities.canManageUsers ? data.adminUsers : data.people;
  const filtered = sourcePeople.filter((person) => {
    const matchesSearch = person.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || person.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  const userOptions = data.adminUsers.map((user) => ({ id: user.id, label: user.name }));

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
        <h1 className="text-[var(--text-primary)]">Участники</h1>
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

      <div className="px-5 pb-2">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Найти по ФИО"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-md)] pl-10 pr-4 py-3 text-[15px] outline-none border"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--line-subtle)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        {[
          { key: "all", label: "Все" },
          { key: "participant", label: "Участники" },
          { key: "teacher", label: "Преподаватели" },
          { key: "organizer", label: "Организаторы" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setRoleFilter(filter.key)}
            className="px-3.5 py-1.5 rounded-[var(--radius-sm)] text-[13px] transition-colors"
            style={{
              background: roleFilter === filter.key ? "var(--text-primary)" : "var(--bg-card)",
              color: roleFilter === filter.key ? "var(--text-inverted)" : "var(--text-secondary)",
              border: roleFilter === filter.key ? "none" : "1px solid var(--line-subtle)",
              fontWeight: roleFilter === filter.key ? 500 : 400,
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-8 space-y-2">
        {filtered.map((person) => (
          <SurfaceCard key={person.id} onClick={() => setSelectedPerson(person)} className="p-4 flex items-center gap-3">
            <Avatar name={person.name} size={42} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>{person.name}</p>
              {person.visibility === "name_plus_fields" && person.university && (
                <p className="text-[13px] truncate" style={{ color: "var(--text-tertiary)" }}>
                  {person.university}{person.city ? ` · ${person.city}` : ""}
                </p>
              )}
            </div>
            <RoleBadge role={person.role} />
            {data.currentUser.capabilities.canManageUsers && (
              <ActionIconButton
                kind="edit"
                label={`Редактировать ${person.name}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setAdminState({ kind: "user", mode: "edit", entity: person });
                }}
              />
            )}
          </SurfaceCard>
        ))}
        {filtered.length === 0 && <EmptyState text="Никого не найдено" />}
      </div>

      {selectedPerson && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.25)" }} onClick={() => setSelectedPerson(null)}>
          <div
            className="w-full max-w-lg rounded-t-[var(--radius-xl)] p-6 pb-8 max-h-[80vh] overflow-y-auto"
            style={{ background: "var(--bg-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--line-strong)" }} />
            <div className="flex items-center gap-4 mb-5">
              <Avatar name={selectedPerson.name} size={64} />
              <div className="flex-1">
                <h2 className="text-[var(--text-primary)] mb-1">{selectedPerson.name}</h2>
                <RoleBadge role={selectedPerson.role} />
              </div>
              {data.currentUser.capabilities.canManageUsers && (
                <ActionIconButton
                  kind="edit"
                  label="Редактировать пользователя"
                  onClick={(event) => {
                    event.preventDefault();
                    setAdminState({ kind: "user", mode: "edit", entity: selectedPerson });
                  }}
                />
              )}
            </div>

            {selectedPerson.visibility === "name_plus_fields" ? (
              <div className="space-y-0 mb-5 divide-y" style={{ borderColor: "var(--line-subtle)" }}>
                {selectedPerson.university && (
                  <div className="flex justify-between py-3 text-[14px]">
                    <span style={{ color: "var(--text-tertiary)" }}>Вуз</span>
                    <span style={{ color: "var(--text-primary)" }}>{selectedPerson.university}</span>
                  </div>
                )}
                {selectedPerson.city && (
                  <div className="flex justify-between py-3 text-[14px]">
                    <span style={{ color: "var(--text-tertiary)" }}>Город</span>
                    <span style={{ color: "var(--text-primary)" }}>{selectedPerson.city}</span>
                  </div>
                )}
                {selectedPerson.telegram && (
                  <div className="flex justify-between py-3 text-[14px]">
                    <span style={{ color: "var(--text-tertiary)" }}>Telegram</span>
                    <a href={`https://t.me/${selectedPerson.telegram.replace("@", "")}`} className="flex items-center gap-1" style={{ color: "var(--info)" }}>
                      {selectedPerson.telegram} <ExternalLink size={13} />
                    </a>
                  </div>
                )}
                {"email" in selectedPerson && selectedPerson.email && (
                  <div className="flex justify-between py-3 text-[14px]">
                    <span style={{ color: "var(--text-tertiary)" }}>Email</span>
                    <span className="flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                      <Mail size={13} /> {selectedPerson.email}
                    </span>
                  </div>
                )}
                {"showInPeople" in selectedPerson && (
                  <>
                    <div className="flex justify-between py-3 text-[14px]">
                      <span style={{ color: "var(--text-tertiary)" }}>Показывать в людях</span>
                      <span style={{ color: "var(--text-primary)" }}>{selectedPerson.showInPeople ? "Да" : "Нет"}</span>
                    </div>
                    <div className="flex justify-between py-3 text-[14px]">
                      <span style={{ color: "var(--text-tertiary)" }}>Активен</span>
                      <span style={{ color: "var(--text-primary)" }}>{selectedPerson.isActive ? "Да" : "Нет"}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-[14px] mb-5" style={{ color: "var(--text-tertiary)" }}>
                Профиль скрыт участником. Отображается только ФИО.
              </p>
            )}

            {data.currentUser.capabilities.canManageUsers && (
              <div className="space-y-5 mb-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Заселение</p>
                    <ActionIconButton
                      kind={selectedRoomAssignment ? "edit" : "plus"}
                      label={selectedRoomAssignment ? "Редактировать заселение" : "Добавить заселение"}
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminState({
                          kind: "roomAssignment",
                          mode: selectedRoomAssignment ? "edit" : "create",
                          entity: selectedRoomAssignment ?? undefined,
                          defaults: { userId: selectedPerson.id },
                        });
                      }}
                    />
                  </div>
                  {selectedRoomAssignment ? (
                    <SurfaceCard className="p-4 flex items-center gap-3">
                      <House size={18} style={{ color: "var(--text-secondary)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>
                          Комната {selectedRoomAssignment.number}, этаж {selectedRoomAssignment.floor}
                        </p>
                        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{selectedRoomAssignment.building}</p>
                      </div>
                    </SurfaceCard>
                  ) : (
                    <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>Заселение ещё не задано.</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Документы</p>
                    <ActionIconButton
                      kind="plus"
                      label="Добавить документ"
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminState({ kind: "document", mode: "create", defaults: { userId: selectedPerson.id } });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    {selectedDocs.length > 0 ? (
                      selectedDocs.map((document) => (
                        <SurfaceCard key={document.id} className="p-3.5 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>{document.title}</p>
                            <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{document.status}</p>
                          </div>
                          <ActionIconButton
                            kind="edit"
                            label="Редактировать документ"
                            onClick={(event) => {
                              event.preventDefault();
                              setAdminState({ kind: "document", mode: "edit", entity: document });
                            }}
                          />
                        </SurfaceCard>
                      ))
                    ) : (
                      <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>Документов пока нет.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedPerson(null)}
              className="w-full py-3 rounded-[var(--radius-md)] text-[15px]"
              style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
            >
              Закрыть
            </button>
          </div>
        </div>
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
          if (!adminState) {
            return;
          }
          const resource = ADMIN_PATHS[adminState.kind];
          if (adminState.mode === "create") {
            await createAdminEntity(resource, payload);
            return;
          }
          const entityId = adminState.kind === "roomAssignment"
            ? (adminState.entity as { userId: string }).userId
            : (adminState.entity as { id: string }).id;
          await updateAdminEntity(resource, entityId, payload);
        }}
      />
    </PageShell>
  );
}
