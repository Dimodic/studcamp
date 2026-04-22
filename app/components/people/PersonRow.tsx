import { Avatar } from "../common";
import type { AdminUser, Person } from "../../lib/domain";
import { ROLE_LABELS, ROLE_STYLES } from "../../lib/options";
import { ActionIconButton } from "../admin-ui";

interface PersonRowProps {
  person: Person | AdminUser;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PersonRow({ person, onClick, onEdit, onDelete }: PersonRowProps) {
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
        <p
          className="text-[14.5px] leading-snug truncate"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
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
