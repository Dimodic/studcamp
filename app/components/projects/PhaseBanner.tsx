import { SurfaceCard } from "../common";
import type { ProjectSelectionPhase } from "../../lib/domain";
import { PHASE_COPY } from "./constants";

interface PhaseBannerProps {
  phase: ProjectSelectionPhase;
  selectedCount: number;
}

export function PhaseBanner({ phase, selectedCount }: PhaseBannerProps) {
  const copy = PHASE_COPY[phase];
  const Icon = copy.icon;
  const isOpen = phase === "open";
  const isResults = phase === "results";
  const tileBackground = isResults
    ? "var(--brand)"
    : `color-mix(in srgb, ${copy.accent} 14%, transparent)`;
  const tileColor = isResults ? "var(--brand-contrast)" : copy.accent;

  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ background: tileBackground, color: tileColor }}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {copy.title}
          </p>
          <p
            className="text-[13.5px] mt-1 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {copy.description}
          </p>
          {isOpen && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  Выбрано
                </span>
                <span
                  className="text-[13px]"
                  style={{ color: "var(--text-primary)", fontWeight: 600 }}
                >
                  {selectedCount} / 5
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(selectedCount, 5) * 20}%`,
                    background: "var(--brand)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}
