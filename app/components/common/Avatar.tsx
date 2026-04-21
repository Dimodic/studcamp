const COLORS = [
  "#FF6B6B", "#E85D9B", "#A855F7", "#6C63FF", "#3B82F6",
  "#0EA5E9", "#14B8A6", "#22C55E", "#84CC16", "#EAB308",
  "#F97316", "#EF4444", "#8B5CF6", "#06B6D4", "#10B981",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 40, className = "" }: AvatarProps) {
  const color = COLORS[hashName(name) % COLORS.length];
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.38);

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}18`,
        color,
        fontSize,
      }}
    >
      <span style={{ lineHeight: 1 }}>{initials}</span>
    </div>
  );
}
