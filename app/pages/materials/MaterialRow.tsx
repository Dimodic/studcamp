import { Download, File } from "lucide-react";

import { MATERIAL_TYPE_LABELS } from "../../lib/options";
import type { Material } from "../../lib/domain";
import { ActionIconButton } from "../../components/admin";
import { TYPE_ACCENT, TYPE_ICONS } from "./constants";
import { openExternal } from "./types";

interface MaterialRowProps {
  material: Material;
  eventLabel?: string | null;
  canEdit: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  onToggleHidden?: () => void;
}

export function MaterialRow({
  material,
  eventLabel,
  canEdit,
  onEdit,
  onDelete,
  onToggleHidden,
}: MaterialRowProps) {
  const Icon = TYPE_ICONS[material.type] ?? File;
  const accent = TYPE_ACCENT[material.type] ?? "var(--text-secondary)";
  const metaParts = [MATERIAL_TYPE_LABELS[material.type]];
  if (material.fileSize) metaParts.push(material.fileSize);
  if (material.topic) metaParts.push(material.topic);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
    >
      <div
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          color: accent,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] leading-snug"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          {material.title}
        </p>
        <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {metaParts.join(" · ")}
          {eventLabel && (
            <>
              <span> · </span>
              <span style={{ color: "var(--text-secondary)" }}>{eventLabel}</span>
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => openExternal(material.url)}
        aria-label={`Открыть ${material.title}`}
        className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center transition-colors hover:bg-[var(--bg-card)]"
        style={{ color: "var(--info)" }}
      >
        <Download size={18} />
      </button>
      {canEdit && (
        <ActionIconButton
          kind="edit"
          label="Редактировать материал"
          onClick={(event) => {
            event.preventDefault();
            onEdit();
          }}
        />
      )}
      {canEdit && onToggleHidden && (
        <ActionIconButton
          kind={material.isHidden ? "show" : "hide"}
          label={material.isHidden ? "Показать участникам" : "Скрыть от участников"}
          onClick={(event) => {
            event.preventDefault();
            onToggleHidden();
          }}
        />
      )}
      {canEdit && onDelete && (
        <ActionIconButton
          kind="delete"
          label="Удалить материал"
          onClick={(event) => {
            event.preventDefault();
            if (window.confirm(`Удалить материал «${material.title}»?`)) {
              onDelete();
            }
          }}
        />
      )}
    </div>
  );
}
