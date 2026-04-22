import type { MutableRefObject } from "react";

import type { Material } from "../../lib/domain";
import { MaterialRow } from "./MaterialRow";
import { formatDayHeader, type DayGroup } from "./types";

interface DayGroupSectionProps {
  group: DayGroup;
  currentDay: number;
  canManageMaterials: boolean;
  eventLabelFor: (material: Material) => string | null;
  onEditMaterial: (material: Material) => void;
  onDeleteMaterial: (material: Material) => void;
  onToggleMaterialHidden: (material: Material) => void;
  dayRefs: MutableRefObject<Map<number, HTMLElement>>;
}

export function DayGroupSection({
  group,
  currentDay,
  canManageMaterials,
  eventLabelFor,
  onEditMaterial,
  onDeleteMaterial,
  onToggleMaterialHidden,
  dayRefs,
}: DayGroupSectionProps) {
  return (
    <section
      ref={(node) => {
        if (node) {
          dayRefs.current.set(group.day, node);
        } else {
          dayRefs.current.delete(group.day);
        }
      }}
      className="scroll-mt-20"
    >
      <div
        className="sticky top-0 z-10 py-3 flex items-center gap-3"
        style={{ background: "var(--bg-app)" }}
      >
        <p
          className="text-[12px] tracking-wide"
          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          {group.date ? formatDayHeader(group.date) : `ДЕНЬ ${group.day}`}
        </p>
        <span
          className="text-[12px] px-2 py-0.5 rounded-[var(--radius-sm)]"
          style={{
            background: group.day === currentDay ? "var(--brand-soft)" : "var(--bg-subtle)",
            color: group.day === currentDay ? "var(--brand-contrast)" : "var(--text-secondary)",
            fontWeight: group.day === currentDay ? 600 : 400,
          }}
        >
          День {group.day}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--line-subtle)" }} />
      </div>
      <div className="space-y-3">
        {group.materials.map((material) => (
          <MaterialRow
            key={material.id}
            material={material}
            eventLabel={eventLabelFor(material)}
            canEdit={canManageMaterials}
            onEdit={() => onEditMaterial(material)}
            onDelete={() => onDeleteMaterial(material)}
            onToggleHidden={() => onToggleMaterialHidden(material)}
          />
        ))}
      </div>
    </section>
  );
}
