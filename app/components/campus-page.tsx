import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  BedDouble,
  Building,
  BusFront,
  ChevronDown,
  Droplets,
  Info,
  Key,
  MapPinned,
  Plug,
  Printer,
  Shirt,
  Users,
  Utensils,
  VolumeX,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { PageShell, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  droplets: Droplets,
  printer: Printer,
  shirt: Shirt,
  plug: Plug,
  "volume-x": VolumeX,
  utensils: Utensils,
  bed: BedDouble,
  "bus-front": BusFront,
  "map-pinned": MapPinned,
  info: Info,
  building: Building,
};

/**
 * Если организатор указал категорию с эмодзи или странным icon-ключом —
 * пытаемся угадать подходящую иконку по названию / тексту, чтобы в кампусе
 * был осмысленный визуальный маркер.
 */
const ICON_RULES: Array<{ pattern: RegExp; key: keyof typeof CATEGORY_ICONS }> = [
  { pattern: /wi[- ]?fi|интернет|сеть/i, key: "wifi" },
  { pattern: /душ|ванн|мыт|гигиен|вод/i, key: "droplets" },
  { pattern: /принтер|печат|скан/i, key: "printer" },
  { pattern: /стирк|прачеч|одежд|бель/i, key: "shirt" },
  { pattern: /розетк|электр|заряд|ток/i, key: "plug" },
  { pattern: /тишин|режим|часы тишин|сон/i, key: "volume-x" },
  { pattern: /ед|столов|кух|завтрак|обед|ужин|питан/i, key: "utensils" },
  { pattern: /комнат|проживан|общежит|сосед|кроват/i, key: "bed" },
  { pattern: /автобус|транспорт|шаттл|трансфер|проезд/i, key: "bus-front" },
  { pattern: /адрес|локац|как добрат|корпус/i, key: "map-pinned" },
  { pattern: /здани|кампус|корпус/i, key: "building" },
];

function resolveCategoryIcon(category: { icon: string; title: string }): LucideIcon {
  const iconKey = (category.icon ?? "").trim();
  // "auto" (или пустое значение) — просим систему самой подобрать иконку
  // по ключевым словам в title. Это поведение по умолчанию.
  if (iconKey && iconKey !== "auto") {
    const direct = CATEGORY_ICONS[iconKey];
    if (direct) return direct;
  }
  const haystack = `${iconKey} ${category.title}`;
  for (const rule of ICON_RULES) {
    if (rule.pattern.test(haystack)) return CATEGORY_ICONS[rule.key];
  }
  return Info;
}

const CATEGORY_ACCENTS: Record<string, string> = {
  wifi: "var(--accent-blue)",
  droplets: "var(--accent-teal)",
  printer: "var(--text-secondary)",
  shirt: "var(--accent-violet)",
  plug: "var(--accent-peach-warm)",
  "volume-x": "var(--text-tertiary)",
  utensils: "var(--accent-lilac)",
  bed: "var(--accent-blue)",
  "bus-front": "var(--accent-peach-warm)",
  "map-pinned": "var(--accent-pink)",
  info: "var(--accent-blue)",
  building: "var(--accent-violet)",
};

export function CampusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity, deleteAdminEntity, setEntityVisibility } =
    useAppData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    if (!data) return;
    const searchParams = new URLSearchParams(location.search);
    if (
      searchParams.get("admin") === "create-campus-category" &&
      data.currentUser.capabilities.canManageCampus
    ) {
      setAdminState({ kind: "campusCategory", mode: "create" });
      void navigate("/campus", { replace: true });
    }
  }, [data, location.search, navigate]);

  if (!data) return null;

  const { campusCategories, room, currentUser } = data;
  const eventOptions = data.events.map((event) => ({
    id: event.id,
    label: `${event.title} · ${event.date}`,
  }));

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Назад"
            className="w-9 h-9 -ml-2 rounded-[var(--radius-md)] flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[var(--text-primary)]">Кампус</h1>
        </div>
        {currentUser.capabilities.canManageCampus && (
          <ActionIconButton
            kind="plus"
            label="Добавить раздел кампуса"
            onClick={(event) => {
              event.preventDefault();
              setAdminState({ kind: "campusCategory", mode: "create" });
            }}
          />
        )}
      </div>

      <div className="px-5 pb-8 space-y-6">
        <SurfaceCard className="p-5 sm:p-6">
          {room ? (
            <>
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                  style={{
                    background: "color-mix(in srgb, var(--brand) 18%, transparent)",
                    color: "var(--brand-contrast)",
                  }}
                >
                  <Key size={18} style={{ color: "var(--brand)" }} />
                </div>
                <p
                  className="text-[16px]"
                  style={{ color: "var(--text-primary)", fontWeight: 600 }}
                >
                  Моя комната
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { value: room.number, label: "Номер" },
                  { value: String(room.floor), label: "Этаж" },
                  { value: String(room.neighbors.length), label: "Соседей" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[var(--radius-md)] p-3 text-center"
                    style={{ background: "var(--bg-subtle)" }}
                  >
                    <p
                      className="text-[22px] leading-none mb-1"
                      style={{ color: "var(--text-primary)", fontWeight: 700 }}
                    >
                      {item.value}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="flex items-start gap-2 text-[14px] mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <Building
                  size={15}
                  className="mt-[3px] shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <span>{room.building}</span>
              </div>
              {room.neighbors.length > 0 && (
                <div
                  className="flex items-start gap-2 text-[14px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Users
                    size={15}
                    className="mt-[3px] shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <span>{room.neighbors.join(", ")}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--info) 14%, transparent)",
                  color: "var(--info)",
                }}
              >
                <Info size={18} />
              </div>
              <div>
                <p
                  className="text-[15px] mb-1"
                  style={{ color: "var(--text-primary)", fontWeight: 500 }}
                >
                  Комната ещё не назначена
                </p>
                <p className="text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
                  Следите за орг-обновлениями — расселение опубликуют перед заездом.
                </p>
              </div>
            </div>
          )}
        </SurfaceCard>

        {campusCategories.length > 0 && (
          <div className="space-y-2">
            {campusCategories.map((category) => {
              const isOpen = expandedId === category.id;
              const Icon = resolveCategoryIcon(category);
              const accent = CATEGORY_ACCENTS[category.icon] ?? "var(--text-secondary)";

              return (
                <SurfaceCard key={category.id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : category.id)}
                    aria-expanded={isOpen}
                    className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <div
                      className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                        color: accent,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span
                      className="flex-1 text-[15px]"
                      style={{ color: "var(--text-primary)", fontWeight: 500 }}
                    >
                      {category.title}
                    </span>
                    {currentUser.capabilities.canManageCampus && (
                      <>
                        <ActionIconButton
                          kind="edit"
                          label="Редактировать раздел"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setAdminState({
                              kind: "campusCategory",
                              mode: "edit",
                              entity: category,
                            });
                          }}
                        />
                        <ActionIconButton
                          kind={category.isHidden ? "show" : "hide"}
                          label={category.isHidden ? "Показать участникам" : "Скрыть от участников"}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void setEntityVisibility(
                              "campus-categories",
                              category.id,
                              !category.isHidden,
                            );
                          }}
                        />
                        <ActionIconButton
                          kind="delete"
                          label="Удалить раздел"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (window.confirm(`Удалить раздел «${category.title}»?`)) {
                              void deleteAdminEntity("campus-categories", category.id);
                            }
                          }}
                        />
                      </>
                    )}
                    <ChevronDown
                      size={18}
                      style={{
                        color: "var(--text-tertiary)",
                        transition: "transform 0.2s ease",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {isOpen && (
                    <div
                      className="px-4 pb-4 pt-1 space-y-3 border-t"
                      style={{ borderColor: "var(--line-subtle)" }}
                    >
                      {category.items.map((item, index) => (
                        <div
                          key={index}
                          className="pt-3"
                          style={{
                            borderTop: index === 0 ? "none" : "1px dashed var(--line-subtle)",
                          }}
                        >
                          <p
                            className="text-[14px] mb-1"
                            style={{ color: "var(--text-primary)", fontWeight: 500 }}
                          >
                            {item.title}
                          </p>
                          <p
                            className="text-[13.5px] leading-relaxed"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {item.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </div>

      <AdminEditorModal
        open={adminState !== null}
        kind={adminState?.kind ?? null}
        mode={adminState?.mode ?? "create"}
        entity={adminState?.entity}
        defaults={adminState?.defaults}
        eventOptions={eventOptions}
        onClose={() => setAdminState(null)}
        onSubmit={async (payload) => {
          if (!adminState) {
            return;
          }
          const resource = ADMIN_PATHS[adminState.kind];
          if (adminState.mode === "create") {
            await createAdminEntity(resource, payload);
            return;
          }
          await updateAdminEntity(resource, (adminState.entity as { id: string }).id, payload);
        }}
      />
    </PageShell>
  );
}
