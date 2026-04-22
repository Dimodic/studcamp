import { useNavigate } from "react-router";
import { Check, Loader2, AlertTriangle, Circle, AlertCircle, Copy, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell, SurfaceCard } from "../components/common";
import { useAppData } from "../lib/app-data";
import {
  AdminEditorModal,
  ADMIN_PATHS,
  ActionIconButton,
  type AdminEntityKind,
} from "../components/admin";
import type { AdminDocument, DocItem } from "../lib/domain";

const STATUS_MAP = {
  done: { label: "Готово", icon: Check, color: "var(--success)", bg: "var(--success-soft)" },
  in_progress: {
    label: "В процессе",
    icon: Loader2,
    color: "var(--warning)",
    bg: "var(--warning-soft)",
  },
  blocked: {
    label: "Проблема",
    icon: AlertTriangle,
    color: "var(--danger)",
    bg: "var(--danger-soft)",
  },
  not_started: {
    label: "Не начато",
    icon: Circle,
    color: "var(--text-tertiary)",
    bg: "var(--bg-subtle)",
  },
};

export function DocumentsPage() {
  const navigate = useNavigate();
  const { data, createAdminEntity, updateAdminEntity, deleteAdminEntity } = useAppData();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
  } | null>(null);

  const userOptions = useMemo(() => {
    if (!data) return [];
    const source = data.adminUsers.length > 0 ? data.adminUsers : data.people;
    return source.map((person) => ({ id: person.id, label: person.name }));
  }, [data]);

  if (!data) {
    return null;
  }

  const { documents, adminDocuments, currentUser } = data;
  const canManage = currentUser.capabilities.canManageDocuments;
  const rows: Array<DocItem | AdminDocument> = canManage ? adminDocuments : documents;
  const done = rows.filter((d) => d.status === "done").length;
  const total = rows.length;
  const userNameById = new Map(
    (data.adminUsers.length > 0 ? data.adminUsers : data.people).map((person) => [
      person.id,
      person.name,
    ]),
  );

  const copyEmail = (id: string) => {
    void navigator.clipboard?.writeText("camp-docs@yandex.ru");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="min-h-full"
      style={{ background: "var(--bg-app)", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <PageShell size="wide">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-[var(--text-primary)]">Документы</h1>
          {canManage && (
            <ActionIconButton
              kind="plus"
              label="Создать документ"
              onClick={(event) => {
                event.preventDefault();
                setAdminState({ kind: "document", mode: "create" });
              }}
            />
          )}
        </div>

        <div className="px-5 mb-4">
          <SurfaceCard className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>
                Прогресс
              </p>
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                {done}/{total}
              </p>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: "var(--bg-subtle)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: total > 0 ? `${(done / total) * 100}%` : "0%",
                  background: "var(--success)",
                }}
              />
            </div>
            {rows.some((d) => d.status === "blocked") && (
              <div
                className="flex items-center gap-1.5 mt-3 text-[13px]"
                style={{ color: "var(--danger)" }}
              >
                <AlertCircle size={14} /> Есть проблемы, требующие внимания
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="px-5 pb-8 space-y-3">
          {rows.length === 0 && (
            <SurfaceCard className="p-6 text-center">
              <p className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
                {canManage
                  ? "Пока нет документов. Создайте первый — «+» справа сверху."
                  : "Пока нет документов."}
              </p>
            </SurfaceCard>
          )}
          {rows.map((doc) => {
            const s = STATUS_MAP[doc.status];
            const Icon = s.icon;
            const ownerName = canManage && "userId" in doc ? userNameById.get(doc.userId) : null;
            return (
              <SurfaceCard
                key={doc.id}
                className={`p-4 ${doc.status === "blocked" ? "border-[var(--danger)]/20" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                    style={{ background: s.bg }}
                  >
                    <Icon
                      size={17}
                      style={{ color: s.color }}
                      className={doc.status === "in_progress" ? "animate-spin" : ""}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>
                        {doc.title}
                      </p>
                      {doc.critical && (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded-[var(--radius-sm)]"
                          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                        >
                          !
                        </span>
                      )}
                    </div>
                    {ownerName && (
                      <p className="text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
                        {ownerName}
                      </p>
                    )}
                    <p className="text-[13px] mb-1" style={{ color: "var(--text-secondary)" }}>
                      {doc.description}
                    </p>
                    {doc.deadline && (
                      <p className="text-[13px]" style={{ color: "var(--warning)" }}>
                        Дедлайн: {doc.deadline}
                      </p>
                    )}
                    <span
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)] mt-1.5 inline-block"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>

                    {doc.fallback && (
                      <div
                        className="mt-3 rounded-[var(--radius-md)] p-3"
                        style={{ background: "var(--bg-subtle)" }}
                      >
                        <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>
                          {doc.fallback}
                        </p>
                        <button
                          onClick={() => copyEmail(doc.id)}
                          className="flex items-center gap-1.5 text-[13px]"
                          style={{ color: "var(--info)" }}
                        >
                          <Copy size={13} />
                          {copiedId === doc.id ? "Скопировано!" : "camp-docs@yandex.ru"}
                        </button>
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <ActionIconButton
                        kind="edit"
                        label="Редактировать документ"
                        onClick={(event) => {
                          event.preventDefault();
                          setAdminState({ kind: "document", mode: "edit", entity: doc });
                        }}
                      />
                      <ActionIconButton
                        kind="delete"
                        label="Удалить документ"
                        onClick={(event) => {
                          event.preventDefault();
                          if (window.confirm(`Удалить документ «${doc.title}»?`)) {
                            void deleteAdminEntity("documents", doc.id);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>

        <AdminEditorModal
          open={adminState !== null}
          kind={adminState?.kind ?? null}
          mode={adminState?.mode ?? "create"}
          entity={adminState?.entity}
          userOptions={userOptions}
          onClose={() => setAdminState(null)}
          onSubmit={async (payload) => {
            if (!adminState) return;
            const resource = ADMIN_PATHS[adminState.kind];
            if (adminState.mode === "create") {
              await createAdminEntity(resource, payload);
              return;
            }
            await updateAdminEntity(resource, (adminState.entity as { id: string }).id, payload);
          }}
        />
      </PageShell>
    </div>
  );
}
