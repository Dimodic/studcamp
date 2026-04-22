import { ExternalLink, Link2 } from "lucide-react";

import { SurfaceCard } from "../common";
import type { Resource } from "../../lib/domain";
import { ActionIconButton } from "../admin-ui";
import { RESOURCE_KIND_LABELS } from "./constants";
import { openExternal } from "./types";

interface StudyResourcesSectionProps {
  studyResources: Resource[];
  canManageResources: boolean;
  onAddResource: () => void;
  onEditResource: (resource: Resource) => void;
  onDeleteResource: (resource: Resource) => void;
  onToggleResourceHidden: (resource: Resource) => void;
}

export function StudyResourcesSection({
  studyResources,
  canManageResources,
  onAddResource,
  onEditResource,
  onDeleteResource,
  onToggleResourceHidden,
}: StudyResourcesSectionProps) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Полезные ссылки
        </p>
        {canManageResources && (
          <ActionIconButton
            kind="plus"
            label="Добавить ссылку"
            onClick={(event) => {
              event.preventDefault();
              onAddResource();
            }}
          />
        )}
      </div>
      <div className="pb-2">
        {studyResources.map((resource) => (
          <div
            key={resource.id}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <Link2 size={16} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
            <button
              type="button"
              onClick={() => openExternal(resource.url)}
              className="flex-1 min-w-0 text-left"
            >
              <p
                className="text-[13.5px] leading-snug truncate"
                style={{ color: "var(--text-primary)", fontWeight: 500 }}
              >
                {resource.title}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {RESOURCE_KIND_LABELS[resource.kind] ?? resource.kind}
              </p>
            </button>
            <button
              type="button"
              onClick={() => openExternal(resource.url)}
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
              style={{ color: "var(--info)" }}
              aria-label={`Открыть ${resource.title}`}
            >
              <ExternalLink size={14} />
            </button>
            {canManageResources && (
              <>
                <ActionIconButton
                  kind="edit"
                  label="Редактировать"
                  onClick={(event) => {
                    event.preventDefault();
                    onEditResource(resource);
                  }}
                />
                <ActionIconButton
                  kind={resource.isHidden ? "show" : "hide"}
                  label={resource.isHidden ? "Показать участникам" : "Скрыть от участников"}
                  onClick={(event) => {
                    event.preventDefault();
                    onToggleResourceHidden(resource);
                  }}
                />
                <ActionIconButton
                  kind="delete"
                  label="Удалить"
                  onClick={(event) => {
                    event.preventDefault();
                    if (window.confirm(`Удалить ссылку «${resource.title}»?`)) {
                      onDeleteResource(resource);
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
