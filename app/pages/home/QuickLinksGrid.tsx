import { SurfaceCard } from "../../components/common";
import type { QuickLink } from "./types";

interface QuickLinksGridProps {
  links: QuickLink[];
}

export function QuickLinksGrid({ links }: QuickLinksGridProps) {
  return (
    <SurfaceCard className="p-4 sm:p-5">
      <p
        className="text-[11px] uppercase tracking-wider mb-3"
        style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
      >
        Быстрые переходы
      </p>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.label}
              onClick={link.onClick}
              className="flex flex-col items-start gap-2 rounded-[var(--radius-md)] p-3 text-left border transition-colors hover:bg-[var(--bg-subtle)]"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--line-subtle)",
              }}
            >
              <div
                className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${link.accent} 14%, transparent)`,
                  color: link.accent,
                }}
              >
                <Icon size={16} />
              </div>
              <div>
                <p
                  className="text-[13.5px]"
                  style={{ color: "var(--text-primary)", fontWeight: 500 }}
                >
                  {link.label}
                </p>
                <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {link.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
