// Палитра из айдентики Яндекс Образования (см. styles/theme.css — --accent-*).
const COLORS = [
  "#799DFF",
  "#FDC2B4",
  "#DAD06E",
  "#FF37B9",
  "#9586E5",
  "#5A9BB9",
  "#A48EEF",
  "#82E5F0",
  "#F9D1BD",
  "#F5EB7D",
  "#7F5DD8",
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
