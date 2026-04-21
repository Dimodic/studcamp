import { useState } from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, ChevronDown, ChevronUp, Wifi, Users, Droplets, Printer, Shirt, Plug, VolumeX, Utensils, BedDouble, BusFront, MapPinned, Info, Link2, ExternalLink, Key } from "lucide-react";
import { PageShell, SectionHeader, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";
import { AdminEditorModal, ADMIN_PATHS, ActionIconButton, type AdminEntityKind } from "./admin-ui";

const CATEGORY_ICONS: Record<string, typeof Wifi> = {
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
};

const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  logistics: "Логистика",
  housing: "Проживание",
  forms: "Формы",
  media: "Медиа",
};

const RESOURCE_KIND_LABELS: Record<string, string> = {
  doc: "Документ",
  sheet: "Таблица",
  form: "Форма",
  folder: "Папка",
  calendar: "Календарь",
  gallery: "Галерея",
  map: "Карта",
  repo: "Репозиторий",
  guide: "Гайд",
};

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function CampusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, createAdminEntity, updateAdminEntity } = useAppData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
    defaults?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("admin") === "create-campus-category" && data.currentUser.capabilities.canManageCampus) {
      setAdminState({ kind: "campusCategory", mode: "create" });
      navigate("/campus", { replace: true });
    }
  }, [data, location.search, navigate]);

  if (!data) {
    return null;
  }

  const { campusCategories, room, resources, currentUser } = data;
  const supportResources = resources.filter((resource) => ["logistics", "housing", "forms", "media"].includes(resource.category));
  const eventOptions = data.events.map((event) => ({ id: event.id, label: `${event.title} · ${event.date}` }));

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageShell size="wide">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-[var(--text-primary)]">Кампус</h1>
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

        <div className="px-5 mb-4">
          {room ? (
            <SurfaceCard className="p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <Key size={17} style={{ color: "var(--brand)" }} />
                <p className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>Моя комната</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { val: room.number, label: "Номер" },
                  { val: room.floor, label: "Этаж" },
                  { val: room.neighbors.length, label: "Соседи" },
                ].map((item, index) => (
                  <div key={index} className="rounded-[var(--radius-md)] p-3 text-center" style={{ background: "var(--bg-subtle)" }}>
                    <p className="text-[20px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.val}</p>
                    <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[14px] mb-1" style={{ color: "var(--text-primary)" }}>{room.building}</p>
              <div className="flex items-center gap-1.5 text-[13px] mb-1" style={{ color: "var(--text-secondary)" }}>
                <Users size={13} /> {room.neighbors.join(", ")}
              </div>
              <p className="text-[13px] mb-2" style={{ color: "var(--text-tertiary)" }}>{room.keyInfo}</p>
              <div className="flex flex-wrap gap-1.5">
                {room.rules.map((rule, index) => (
                  <span key={index} className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)]" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                    {rule}
                  </span>
                ))}
              </div>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <Info size={17} style={{ color: "var(--info)" }} />
                <p className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>Личное заселение не определено</p>
              </div>
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                У технического viewer-пользователя нет персональной комнаты. Общие таблицы расселения и логистики доступны ниже.
              </p>
            </SurfaceCard>
          )}
        </div>

        {supportResources.length > 0 && (
          <div className="px-5 mb-4">
            <SectionHeader
              title="Полезные ссылки"
              right={(
                currentUser.capabilities.canManageResources ? (
                  <ActionIconButton
                    kind="plus"
                    label="Добавить ссылку"
                    onClick={(event) => {
                      event.preventDefault();
                      setAdminState({ kind: "resource", mode: "create", defaults: { category: "logistics" } });
                    }}
                  />
                ) : undefined
              )}
            />
            <div className="space-y-2">
              {supportResources.map((resource) => (
                <SurfaceCard key={resource.id} className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: "var(--bg-subtle)" }}>
                    <Link2 size={18} style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] line-clamp-1" style={{ color: "var(--text-primary)" }}>{resource.title}</p>
                    <div className="flex items-center gap-2 text-[12px] flex-wrap" style={{ color: "var(--text-tertiary)" }}>
                      <span>{RESOURCE_CATEGORY_LABELS[resource.category] ?? resource.category}</span>
                      <span>{RESOURCE_KIND_LABELS[resource.kind] ?? resource.kind}</span>
                      {resource.day && <span>День {resource.day}</span>}
                    </div>
                  </div>
                  <button onClick={() => openExternal(resource.url)} style={{ color: "var(--info)" }}>
                    <ExternalLink size={19} />
                  </button>
                  {currentUser.capabilities.canManageResources && (
                    <ActionIconButton
                      kind="edit"
                      label="Редактировать ссылку"
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminState({ kind: "resource", mode: "edit", entity: resource });
                      }}
                    />
                  )}
                </SurfaceCard>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 pb-8 space-y-2">
          {campusCategories.map((category) => {
            const isOpen = expandedId === category.id;
            const Icon = CATEGORY_ICONS[category.icon] || Wifi;
            return (
              <SurfaceCard key={category.id} className="overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isOpen ? null : category.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedId(isOpen ? null : category.id);
                    }
                  }}
                  className="w-full p-4 flex items-center gap-3 text-left cursor-pointer"
                >
                  <div
                    className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                    style={{ background: "var(--bg-subtle)" }}
                  >
                    <Icon size={16} style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <span className="flex-1 text-[15px]" style={{ color: "var(--text-primary)" }}>{category.title}</span>
                  {currentUser.capabilities.canManageCampus && (
                    <ActionIconButton
                      kind="edit"
                      label="Редактировать раздел"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setAdminState({ kind: "campusCategory", mode: "edit", entity: category });
                      }}
                    />
                  )}
                  {isOpen ? (
                    <ChevronUp size={17} style={{ color: "var(--text-tertiary)" }} />
                  ) : (
                    <ChevronDown size={17} style={{ color: "var(--text-tertiary)" }} />
                  )}
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2.5 border-t pt-3" style={{ borderColor: "var(--line-subtle)" }}>
                    {category.items.map((item, index) => (
                      <div key={index}>
                        <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </SurfaceCard>
            );
          })}
        </div>
      </PageShell>

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
    </div>
  );
}
