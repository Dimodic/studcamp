import { useNavigate } from "react-router";
import { Check, Loader2, AlertTriangle, Circle, AlertCircle, Copy, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { PageShell, SurfaceCard } from "./common";
import { useAppData } from "../lib/app-data";

const STATUS_MAP = {
  done: { label: "Готово", icon: Check, color: "var(--success)", bg: "var(--success-soft)" },
  in_progress: { label: "В процессе", icon: Loader2, color: "var(--warning)", bg: "var(--warning-soft)" },
  blocked: { label: "Проблема", icon: AlertTriangle, color: "var(--danger)", bg: "var(--danger-soft)" },
  not_started: { label: "Не начато", icon: Circle, color: "var(--text-tertiary)", bg: "var(--bg-subtle)" },
};

export function DocumentsPage() {
  const navigate = useNavigate();
  const { data } = useAppData();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!data) {
    return null;
  }

  const { documents } = data;
  const done = documents.filter(d => d.status === "done").length;
  const total = documents.length;

  const copyEmail = (id: string) => {
    navigator.clipboard?.writeText("camp-docs@yandex.ru");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-full" style={{ background: "var(--bg-app)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageShell size="wide">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1" style={{ color: "var(--text-secondary)" }}><ArrowLeft size={22} /></button>
          <h1 className="text-[var(--text-primary)]">Документы</h1>
        </div>

        {/* Progress */}
        <div className="px-5 mb-4">
          <SurfaceCard className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>Прогресс</p>
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>{done}/{total}</p>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: "var(--success)" }} />
            </div>
            {documents.some(d => d.status === "blocked") && (
              <div className="flex items-center gap-1.5 mt-3 text-[13px]" style={{ color: "var(--danger)" }}>
                <AlertCircle size={14} /> Есть проблемы, требующие внимания
              </div>
            )}
          </SurfaceCard>
        </div>

        {/* Document list */}
        <div className="px-5 pb-8 space-y-3">
          {documents.map(doc => {
            const s = STATUS_MAP[doc.status];
            const Icon = s.icon;
            return (
              <SurfaceCard key={doc.id} className={`p-4 ${doc.status === "blocked" ? "border-[var(--danger)]/20" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                    <Icon size={17} style={{ color: s.color }} className={doc.status === "in_progress" ? "animate-spin" : ""} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>{doc.title}</p>
                      {doc.critical && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-[var(--radius-sm)]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>!</span>
                      )}
                    </div>
                    <p className="text-[13px] mb-1" style={{ color: "var(--text-secondary)" }}>{doc.description}</p>
                    {doc.deadline && (
                      <p className="text-[13px]" style={{ color: "var(--warning)" }}>Дедлайн: {doc.deadline}</p>
                    )}
                    <span className="text-[12px] px-2.5 py-1 rounded-[var(--radius-sm)] mt-1.5 inline-block" style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>

                    {doc.fallback && (
                      <div className="mt-3 rounded-[var(--radius-md)] p-3" style={{ background: "var(--bg-subtle)" }}>
                        <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>{doc.fallback}</p>
                        <button onClick={() => copyEmail(doc.id)} className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--info)" }}>
                          <Copy size={13} />
                          {copiedId === doc.id ? "Скопировано!" : "camp-docs@yandex.ru"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </PageShell>
    </div>
  );
}
