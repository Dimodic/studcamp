import { useEffect, useState } from "react";
import { Monitor, Smartphone, Zap } from "lucide-react";
import {
  getViewportMode,
  setViewportMode,
  subscribeViewportMode,
  type ViewportMode,
} from "../../lib/viewport";

const MODE_ORDER: ViewportMode[] = ["auto", "desktop", "mobile"];

const MODE_META: Record<ViewportMode, { label: string; icon: typeof Zap; description: string }> = {
  auto: { label: "Авто", icon: Zap, description: "по ширине экрана" },
  desktop: { label: "Desktop", icon: Monitor, description: "принудительно" },
  mobile: { label: "Mobile", icon: Smartphone, description: "принудительно" },
};

export function DevViewportToggle() {
  const [mode, setMode] = useState<ViewportMode>(() => getViewportMode());

  useEffect(() => {
    const unsubscribe = subscribeViewportMode(() => setMode(getViewportMode()));
    return unsubscribe;
  }, []);

  const current = MODE_META[mode];
  const Icon = current.icon;
  const isOverride = mode !== "auto";

  const cycle = () => {
    const nextIndex = (MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length;
    setViewportMode(MODE_ORDER[nextIndex]);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Dev: viewport — ${current.label} (${current.description}). Клик — переключить.`}
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-3 py-2 rounded-full text-[12px] transition-all hover:scale-[1.03] shadow-lg"
      style={{
        background: isOverride ? "var(--text-primary)" : "var(--bg-card)",
        color: isOverride ? "var(--text-inverted)" : "var(--text-primary)",
        border: `1px solid ${isOverride ? "var(--text-primary)" : "var(--line-subtle)"}`,
        boxShadow: "var(--shadow-floating)",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      <span
        className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--radius-sm)]"
        style={{
          background: isOverride ? "var(--brand)" : "var(--bg-subtle)",
          color: isOverride ? "var(--brand-contrast)" : "var(--text-tertiary)",
        }}
      >
        DEV
      </span>
      <Icon size={14} />
      <span>{current.label}</span>
    </button>
  );
}
