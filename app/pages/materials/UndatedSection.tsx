import type { Material } from "../../lib/domain";
import { MaterialRow } from "./MaterialRow";

interface UndatedSectionProps {
  undated: Material[];
  canManageMaterials: boolean;
  eventLabelFor: (material: Material) => string | null;
  onEditMaterial: (material: Material) => void;
  onDeleteMaterial: (material: Material) => void;
  onToggleMaterialHidden: (material: Material) => void;
}

export function UndatedSection({
  undated,
  canManageMaterials,
  eventLabelFor,
  onEditMaterial,
  onDeleteMaterial,
  onToggleMaterialHidden,
}: UndatedSectionProps) {
  return (
    <section>
      <div
        className="sticky top-0 z-10 py-3 flex items-center gap-3"
        style={{ background: "var(--bg-app)" }}
      >
        <p
          className="text-[12px] tracking-wide"
          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          ОБЩИЕ МАТЕРИАЛЫ
        </p>
        <div className="flex-1 h-px" style={{ background: "var(--line-subtle)" }} />
      </div>
      <div className="space-y-3">
        {undated.map((material) => (
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
