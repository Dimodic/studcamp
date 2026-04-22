import { useMemo, useState, type ChangeEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Paperclip,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { SurfaceCard } from "../common";
import { useAppData } from "../../lib/app-data";
import {
  clearLlmSettings,
  DEFAULT_SETTINGS,
  loadLlmSettings,
  saveLlmSettings,
  type LlmSettings,
} from "../../lib/llm-settings";
import { AdminEditorModal, ADMIN_PATHS, type AdminEntityKind } from "../admin-ui";
import { ENTITY_NOUN } from "../admin/paths";

interface Attachment {
  name: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

async function readFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = bytes.subarray(i, i + 0x8000);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

interface ParsedItem {
  id: string;
  kind: AdminEntityKind;
  payload: Record<string, unknown>;
  applied: boolean;
  error?: string;
}

const KNOWN_KINDS = new Set<AdminEntityKind>([
  "story",
  "orgUpdate",
  "event",
  "user",
  "project",
  "material",
  "resource",
  "campusCategory",
  "roomAssignment",
  "document",
  "camp",
]);

function summarizeItem(payload: Record<string, unknown>): string {
  const candidates = ["title", "name", "text", "shortDescription"];
  for (const key of candidates) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "(без заголовка)";
}

export function MagicBlock() {
  const { parseLlmContent, createAdminEntity } = useAppData();
  const [settings, setSettings] = useState<LlmSettings>(
    () => loadLlmSettings() ?? DEFAULT_SETTINGS,
  );
  const [showSettings, setShowSettings] = useState(() => {
    const saved = loadLlmSettings();
    return !saved || !saved.baseUrl || !saved.model;
  });
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [editState, setEditState] = useState<{ item: ParsedItem } | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);

  const settingsReady = useMemo(
    () => Boolean(settings.baseUrl.trim() && settings.model.trim()),
    [settings],
  );
  const hasCustomSettings =
    Boolean(settings.apiKey) ||
    settings.baseUrl !== DEFAULT_SETTINGS.baseUrl ||
    settings.model !== DEFAULT_SETTINGS.model;

  const persistSettings = (next: LlmSettings) => {
    setSettings(next);
    saveLlmSettings(next);
  };

  const resetKey = () => {
    clearLlmSettings();
    setSettings(DEFAULT_SETTINGS);
    setShowSettings(true);
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files ?? []);
    const newOnes: Attachment[] = [];
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`Файл ${file.name} больше 8 МБ — сократи или раздели.`);
        continue;
      }
      const base64 = await readFileAsBase64(file);
      newOnes.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
        sizeBytes: file.size,
      });
    }
    setAttachments((prev) => [...prev, ...newOnes]);
    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const parse = async () => {
    setError("");
    if (!settingsReady) {
      setShowSettings(true);
      setError("Укажи провайдера, модель и API-ключ.");
      return;
    }
    if (!text.trim() && attachments.length === 0) {
      setError("Вставь текст или прикрепи файл.");
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseLlmContent({
        baseUrl: settings.baseUrl,
        model: settings.model,
        apiKey: settings.apiKey,
        text,
        attachments,
      });
      const mapped: ParsedItem[] = parsed
        .filter((item) => KNOWN_KINDS.has(item.kind as AdminEntityKind))
        .map((item, index) => ({
          id: `${item.kind}-${index}-${Date.now()}`,
          kind: item.kind as AdminEntityKind,
          payload: item.payload,
          applied: false,
        }));
      setItems(mapped);
      if (mapped.length === 0) {
        setError("Модель не нашла, что можно создать. Уточни текст или попробуй другую модель.");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось разобрать текст");
    } finally {
      setParsing(false);
    }
  };

  const applyItem = async (item: ParsedItem): Promise<boolean> => {
    try {
      await createAdminEntity(ADMIN_PATHS[item.kind], item.payload);
      setItems((prev) =>
        prev.map((other) =>
          other.id === item.id ? { ...other, applied: true, error: undefined } : other,
        ),
      );
      return true;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Не удалось сохранить";
      setItems((prev) =>
        prev.map((other) => (other.id === item.id ? { ...other, error: message } : other)),
      );
      return false;
    }
  };

  const applyAll = async () => {
    setApplyingAll(true);
    for (const item of items) {
      if (item.applied) continue;
      await applyItem(item);
    }
    setApplyingAll(false);
  };

  const resetSession = () => {
    setItems([]);
    setText("");
    setAttachments([]);
    setError("");
  };

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ background: "var(--brand-soft)", color: "var(--text-primary)" }}
        >
          <Sparkles size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            Магический ввод
          </p>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Вставь текст или файлы — LLM разложит по разделам
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((prev) => !prev)}
          aria-label={showSettings ? "Скрыть настройки" : "Показать настройки"}
          className="text-[13px] flex items-center gap-1 transition-colors hover:text-[var(--text-primary)]"
          style={{ color: "var(--text-secondary)" }}
        >
          Настройки
          {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showSettings && (
        <div
          className="mb-4 rounded-[var(--radius-md)] border p-3 space-y-3"
          style={{ borderColor: "var(--line-subtle)", background: "var(--bg-subtle)" }}
        >
          <div>
            <span className="block text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
              Base URL
            </span>
            <input
              type="url"
              value={settings.baseUrl}
              onChange={(event) => persistSettings({ ...settings, baseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
              autoComplete="off"
              className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-[13.5px] outline-none font-mono"
              style={{
                borderColor: "var(--line-subtle)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block">
              <span className="block text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
                Модель
              </span>
              <input
                type="text"
                value={settings.model}
                onChange={(event) => persistSettings({ ...settings, model: event.target.value })}
                placeholder="gpt-4o-mini"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-[13.5px] outline-none"
                style={{
                  borderColor: "var(--line-subtle)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
              />
            </label>
            <label className="block">
              <span className="block text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
                API-ключ
              </span>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(event) => persistSettings({ ...settings, apiKey: event.target.value })}
                placeholder="sk-…"
                autoComplete="off"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-[13.5px] outline-none"
                style={{
                  borderColor: "var(--line-subtle)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
              />
            </label>
          </div>

          <div
            className="flex items-center justify-between text-[11.5px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span>Настройки хранятся только в этом браузере.</span>
            {hasCustomSettings && (
              <button
                type="button"
                onClick={resetKey}
                aria-label="Сбросить настройки"
                title="Сбросить настройки"
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--danger)]"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        placeholder="Вставь сюда расписание, новость, список проектов, анкеты участников…"
        className="w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-[14px] outline-none resize-y"
        style={{
          borderColor: "var(--line-subtle)",
          background: "var(--bg-app)",
          color: "var(--text-primary)",
        }}
      />

      {attachments.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {attachments.map((attachment, index) => (
            <span
              key={`${attachment.name}-${index}`}
              className="inline-flex items-center gap-1 text-[12.5px] px-2 py-1 rounded-full"
              style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
            >
              <Paperclip size={11} /> {attachment.name} · {formatSize(attachment.sizeBytes)}
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-0.5 opacity-70 hover:opacity-100"
                aria-label="Удалить файл"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label
          className="text-[13px] flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] border cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
          style={{ borderColor: "var(--line-subtle)", color: "var(--text-secondary)" }}
        >
          <Paperclip size={14} /> Файлы
          <input type="file" multiple onChange={handleFiles} className="hidden" />
        </label>
        <button
          type="button"
          onClick={parse}
          disabled={parsing}
          className="text-[14px] px-4 py-2 rounded-[var(--radius-md)] flex items-center gap-1.5 transition-colors"
          style={{
            background: "var(--brand)",
            color: "var(--brand-contrast)",
            fontWeight: 600,
            opacity: parsing ? 0.6 : 1,
          }}
        >
          {parsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {parsing ? "Думаю…" : "Разобрать"}
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={resetSession}
            className="text-[13px] px-3 py-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Очистить
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <p
              className="text-[11.5px] uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
            >
              Найдено: {items.length}
            </p>
            <button
              type="button"
              onClick={applyAll}
              disabled={applyingAll || items.every((item) => item.applied)}
              className="text-[13px] px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: "var(--brand)",
                color: "var(--brand-contrast)",
                fontWeight: 600,
                opacity: applyingAll ? 0.6 : 1,
              }}
            >
              {applyingAll ? "Сохраняем…" : "Применить всё"}
            </button>
          </div>
          {items.map((item) => {
            const summary = summarizeItem(item.payload);
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border"
                style={{
                  borderColor: item.error ? "var(--danger)" : "var(--line-subtle)",
                  background: item.applied ? "var(--success-soft)" : "var(--bg-card)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                  style={{
                    background: item.applied ? "var(--success)" : "var(--bg-subtle)",
                    color: item.applied ? "var(--text-inverted)" : "var(--text-secondary)",
                  }}
                >
                  {item.applied ? <Check size={15} /> : <Sparkles size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                  >
                    {ENTITY_NOUN[item.kind]}
                  </p>
                  <p
                    className="text-[14px] truncate"
                    style={{ color: "var(--text-primary)", fontWeight: 500 }}
                  >
                    {summary}
                  </p>
                  {item.error && (
                    <p className="text-[12.5px] mt-1" style={{ color: "var(--danger)" }}>
                      {item.error}
                    </p>
                  )}
                </div>
                {!item.applied && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditState({ item })}
                      className="text-[12.5px] px-3 py-1.5 rounded-[var(--radius-sm)] border transition-colors hover:bg-[var(--bg-subtle)]"
                      style={{ borderColor: "var(--line-subtle)", color: "var(--text-primary)" }}
                    >
                      Проверить
                    </button>
                    <button
                      type="button"
                      onClick={() => void applyItem(item)}
                      className="text-[12.5px] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors"
                      style={{
                        background: "var(--brand)",
                        color: "var(--brand-contrast)",
                        fontWeight: 600,
                      }}
                    >
                      Применить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AdminEditorModal
        open={editState !== null}
        kind={editState?.item.kind ?? null}
        mode="create"
        entity={editState?.item.payload}
        onClose={() => setEditState(null)}
        onSubmit={async (payload) => {
          if (!editState) return;
          await createAdminEntity(ADMIN_PATHS[editState.item.kind], payload);
          setItems((prev) =>
            prev.map((other) =>
              other.id === editState.item.id
                ? { ...other, applied: true, error: undefined }
                : other,
            ),
          );
        }}
      />
    </SurfaceCard>
  );
}
