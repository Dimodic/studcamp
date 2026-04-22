import { ExternalLink, File } from "lucide-react";

import { SurfaceCard } from "../common";
import type { Material } from "../../lib/domain";
import { ActionIconButton } from "../admin-ui";
import { openExternal } from "./types";

interface OrgDocsSectionProps {
  orgDocs: Material[];
  canManageMaterials: boolean;
  onAddOrgDoc: () => void;
  onEditMaterial: (material: Material) => void;
  onDeleteMaterial: (material: Material) => void;
  onToggleMaterialHidden: (material: Material) => void;
}

export function OrgDocsSection({
  orgDocs,
  canManageMaterials,
  onAddOrgDoc,
  onEditMaterial,
  onDeleteMaterial,
  onToggleMaterialHidden,
}: OrgDocsSectionProps) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Орг. документы
        </p>
        {canManageMaterials && (
          <ActionIconButton
            kind="plus"
            label="Добавить орг. документ"
            onClick={(event) => {
              event.preventDefault();
              onAddOrgDoc();
            }}
          />
        )}
      </div>
      <div className="pb-2">
        {orgDocs.map((material) => (
          <div
            key={material.id}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <File size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
            <button
              type="button"
              onClick={() => openExternal(material.url)}
              className="flex-1 min-w-0 text-left"
            >
              <p
                className="text-[13.5px] leading-snug truncate"
                style={{ color: "var(--text-primary)", fontWeight: 500 }}
              >
                {material.title}
              </p>
              {material.topic && (
                <p
                  className="text-[12px] mt-0.5 truncate"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {material.topic}
                </p>
              )}
            </button>
            <button
              type="button"
              onClick={() => openExternal(material.url)}
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
              style={{ color: "var(--info)" }}
              aria-label={`Открыть ${material.title}`}
            >
              <ExternalLink size={14} />
            </button>
            {canManageMaterials && (
              <>
                <ActionIconButton
                  kind="edit"
                  label="Редактировать"
                  onClick={(event) => {
                    event.preventDefault();
                    onEditMaterial(material);
                  }}
                />
                <ActionIconButton
                  kind={material.isHidden ? "show" : "hide"}
                  label={material.isHidden ? "Показать участникам" : "Скрыть от участников"}
                  onClick={(event) => {
                    event.preventDefault();
                    onToggleMaterialHidden(material);
                  }}
                />
                <ActionIconButton
                  kind="delete"
                  label="Удалить"
                  onClick={(event) => {
                    event.preventDefault();
                    if (window.confirm(`Удалить «${material.title}»?`)) {
                      onDeleteMaterial(material);
                    }
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
