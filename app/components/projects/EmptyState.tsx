import { FolderKanban } from "lucide-react";

import { SurfaceCard } from "../common";

interface EmptyStateProps {
  canManage: boolean;
  onCreate: () => void;
}

export function EmptyState({ canManage, onCreate }: EmptyStateProps) {
  return (
    <SurfaceCard className="py-14 px-6">
      <div className="flex flex-col items-center max-w-md mx-auto text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{
            background: "color-mix(in srgb, var(--text-tertiary) 10%, transparent)",
            color: "var(--text-tertiary)",
          }}
        >
          <FolderKanban size={24} />
        </div>
        <p className="text-[16px] mb-1.5" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          Проекты ещё не опубликованы
        </p>
        <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Как только организаторы добавят проекты, они появятся здесь. Подпишитесь на уведомления,
          чтобы не пропустить анонс.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] px-4 py-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--brand-hover)]"
            style={{ background: "var(--brand)", color: "var(--brand-contrast)", fontWeight: 600 }}
          >
            Создать первый проект
          </button>
        )}
      </div>
    </SurfaceCard>
  );
}
