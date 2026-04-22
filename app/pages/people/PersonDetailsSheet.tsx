import { ExternalLink, House, Mail, X } from "lucide-react";

import { Avatar } from "../../components/common";
import type { AdminUser, Person } from "../../lib/domain";
import { ROLE_LABELS, ROLE_STYLES } from "../../lib/options";
import { ActionIconButton } from "../../components/admin";
import type { PersonDocument, PersonRoomAssignment, TeamOption } from "./types";

interface PersonDetailsSheetProps {
  person: Person | AdminUser;
  canManageUsers: boolean;
  isSelf: boolean;
  documents: PersonDocument[];
  roomAssignment: PersonRoomAssignment | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditRoom: () => void;
  onDeleteRoom: () => void;
  onCreateDocument: () => void;
  onEditDocument: (document: PersonDocument) => void;
  onDeleteDocument: (document: PersonDocument) => void;
  teamOptions?: TeamOption[];
  currentTeamId?: string | null;
  onAssignTeam?: (teamId: string | null) => void;
}

export function PersonDetailsSheet({
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
        <div
          className="sm:hidden w-10 h-1 rounded-full mx-auto mt-3"
          style={{ background: "var(--line-strong)" }}
        />

        <div
          className="px-6 pt-5 pb-5 flex items-start gap-4 border-b"
          style={{ borderColor: "var(--line-subtle)" }}
        >
          <Avatar name={person.name} size={68} />
          <div className="flex-1 min-w-0">
            <h2
              className="text-[20px] leading-tight mb-1"
              style={{ color: "var(--text-primary)", fontWeight: 600 }}
            >
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
              style={{ gridTemplateColumns: "max-content 1fr" }}
            >
              {person.university && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>ВУЗ</dt>
                  <dd className="m-0" style={{ color: "var(--text-primary)" }}>
                    {person.university}
                  </dd>
                </>
              )}
              {person.city && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>Город</dt>
                  <dd className="m-0" style={{ color: "var(--text-primary)" }}>
                    {person.city}
                  </dd>
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
                  <dd
                    className="m-0 flex items-center gap-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Mail size={13} style={{ color: "var(--text-tertiary)" }} />
                    {person.email}
                  </dd>
                </>
              )}
              {"isActive" in person && (
                <>
                  <dt style={{ color: "var(--text-tertiary)" }}>Активен</dt>
                  <dd
                    className="m-0"
                    style={{ color: person.isActive ? "var(--success)" : "var(--text-tertiary)" }}
                  >
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
                style={{
                  borderColor: "var(--line-subtle)",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                }}
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
                      <p
                        className="text-[14px]"
                        style={{ color: "var(--text-primary)", fontWeight: 500 }}
                      >
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
                          <p
                            className="text-[14px]"
                            style={{ color: "var(--text-primary)", fontWeight: 500 }}
                          >
                            {document.title}
                          </p>
                          <p
                            className="text-[12px] mt-0.5"
                            style={{ color: "var(--text-tertiary)" }}
                          >
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
