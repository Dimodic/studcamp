import type { CSSProperties, ReactNode } from "react";

interface ProgressRingProps {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  /** Цвет дуги прогресса. */
  trackColor?: string;
  /** Цвет фонового круга. */
  baseColor?: string;
  /** Контент внутри кольца (по умолчанию — процент). */
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  title?: string;
}

/**
 * Круговой индикатор прогресса в стиле Яндекс Образования:
 * лёгкий фоновый круг, плотная цветная дуга, процент в центре крупным шрифтом.
 */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  trackColor,
  baseColor = "var(--line-subtle)",
  children,
  style,
  className = "",
  title,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = (clamped / 100) * circumference;

  // Автоподбор цвета дуги по значению, если явно не задан.
  const computedTrackColor =
    trackColor ??
    (clamped >= 90
      ? "var(--success)"
      : clamped >= 50
        ? "var(--accent-violet)"
        : "var(--accent-peach-warm)");

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
      title={title}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={baseColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={computedTrackColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference - arc}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 400ms ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          color: "var(--text-primary)",
          fontSize: Math.round(size * 0.28),
          lineHeight: 1,
        }}
      >
        {children ?? `${clamped}%`}
      </span>
    </div>
  );
}
