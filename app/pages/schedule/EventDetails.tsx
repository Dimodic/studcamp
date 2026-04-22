import { Check, Download, ExternalLink, File, Laptop, Link2, Navigation } from "lucide-react";

import type { Event, Material, Resource } from "../../lib/domain";
import { MATERIAL_TYPE_LABELS } from "../../lib/options";
import { ATTACHMENT_ICONS, MATERIAL_TYPE_ACCENT, RESOURCE_KIND_LABELS } from "./constants";
import { openExternal } from "./types";

interface EventDetailsProps {
  event: Event;
  eventMaterials: Material[];
  eventResources: Resource[];
  groupTheme: string | null;
  hasLaptop: boolean;
  isChecked: boolean;
  checkInEvent: (eventId: string) => Promise<void>;
}

export function EventDetails({
  event,
  eventMaterials,
  eventResources,
  groupTheme,
  hasLaptop,
  isChecked,
  checkInEvent,
}: EventDetailsProps) {
  const attachments = [
    ...eventMaterials.map((item) => ({
      kind: "material" as const,
      item,
    })),
    ...eventResources.map((item) => ({
      kind: "resource" as const,
      item,
    })),
  ];
  const routeQuery = event.address || event.building || event.place;
  const routeLabel = event.address || event.building || event.place || "Открыть в картах";
  const trimmedDescription = (event.description ?? "").trim();
  const showDescription = Boolean(trimmedDescription) && trimmedDescription !== groupTheme;

  return (
    <div
      className="mt-3 pt-3 border-t"
      style={{ borderColor: "var(--line-subtle)" }}
      onClick={(evt) => evt.stopPropagation()}
    >
      {showDescription && (
        <p className="text-[14px] mb-3" style={{ color: "var(--text-secondary)" }}>
          {trimmedDescription}
        </p>
      )}

      {hasLaptop && (
        <div
          className="rounded-[var(--radius-md)] p-3 mb-3 flex items-center gap-2.5"
          style={{ background: "var(--info-soft)" }}
        >
          <Laptop size={15} style={{ color: "var(--info)" }} />
          <p className="text-[13px]" style={{ color: "var(--info)" }}>
            Возьмите ноутбук с зарядкой
          </p>
        </div>
      )}

      {event.materials && event.materials.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {event.materials.map((material) => (
            <span
              key={material}
              className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]"
              style={{
                background: "var(--bg-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {material}
            </span>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachments.map(({ kind, item }) => {
            const isMaterial = kind === "material";
            const accent = isMaterial
              ? (MATERIAL_TYPE_ACCENT[item.type] ?? "var(--text-secondary)")
              : "var(--info)";
            const TypeIcon = isMaterial ? (ATTACHMENT_ICONS[item.type] ?? File) : Link2;
            const metaText = isMaterial
              ? [MATERIAL_TYPE_LABELS[item.type] ?? item.type, item.fileSize]
                  .filter(Boolean)
                  .join(" · ")
              : (RESOURCE_KIND_LABELS[item.kind] ?? item.kind);

            return (
              <div
                key={`${kind}-${item.id}`}
                className="flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] border transition-colors hover:bg-[var(--bg-subtle)]"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--line-subtle)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                    color: accent,
                  }}
                >
                  <TypeIcon size={16} />
                </div>
                <button
                  type="button"
                  onClick={() => openExternal(item.url)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p
                    className="text-[13.5px] leading-snug truncate"
                    style={{
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[11.5px] mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {metaText}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => openExternal(item.url)}
                  aria-label={isMaterial ? "Скачать" : "Открыть ссылку"}
                  className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors hover:bg-[var(--bg-card)] shrink-0"
                  style={{ color: "var(--info)" }}
                >
                  {isMaterial ? <Download size={15} /> : <ExternalLink size={15} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {routeQuery && (
        <button
          type="button"
          onClick={() =>
            openExternal(`https://yandex.ru/maps/?text=${encodeURIComponent(routeQuery)}`)
          }
          className="w-full flex items-center gap-2 py-1 mb-2 text-left transition-colors hover:underline"
        >
          <Navigation size={14} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
          <span className="text-[14px] truncate flex-1" style={{ color: "var(--text-primary)" }}>
            {routeLabel}
          </span>
          <ExternalLink size={13} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
        </button>
      )}

      {event.status === "in_progress" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void checkInEvent(event.id)}
            className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-[var(--radius-md)]"
            style={{
              background: isChecked ? "var(--success-soft)" : "var(--text-primary)",
              color: isChecked ? "var(--success)" : "var(--text-inverted)",
              fontWeight: 500,
            }}
          >
            {isChecked ? (
              <>
                <Check size={13} /> Отмечено
              </>
            ) : (
              "Я здесь"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
