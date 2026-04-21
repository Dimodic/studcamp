import { useMemo, useState, type ChangeEvent } from "react";
import { Check, ImageIcon, Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { SurfaceCard } from "../common";
import { useAppData } from "../../lib/app-data";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import {
  DEFAULT_SETTINGS,
  loadLlmSettings,
  saveLlmSettings,
  type LlmSettings,
} from "../../lib/llm-settings";
import type { Event as CampEvent } from "../../lib/domain";

interface Photo {
  name: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}

interface Matched {
  userId: string;
  name: string;
  signed: boolean;
}

interface AttendanceUploaderProps {
  events: CampEvent[];
  open: boolean;
  defaultEventId?: string;
  onClose: () => void;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

async function readAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function AttendanceUploader({
  events,
  open,
  defaultEventId,
  onClose,
}: AttendanceUploaderProps) {
  const { parseAttendancePhoto, markAttendance } = useAppData();
  const [settings, setSettings] = useState<LlmSettings>(() => loadLlmSettings() ?? DEFAULT_SETTINGS);
  const [eventId, setEventId] = useState<string>(defaultEventId ?? events[0]?.id ?? "");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState<Matched[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState(false);
  useBodyScrollLock(open);

  const settingsReady = useMemo(
    () => Boolean(settings.baseUrl.trim() && settings.model.trim()),
    [settings],
  );

  if (!open) return null;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files ?? []);
    const newPhotos: Photo[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} не похоже на картинку — нужно фото листка`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`${file.name} больше 8 МБ`);
        continue;
      }
      const base64 = await readAsBase64(file);
      newPhotos.push({ name: file.name, mimeType: file.type, base64, sizeBytes: file.size });
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
    event.target.value = "";
  };

  const removePhoto = (index: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index));

  const persistSettings = (next: LlmSettings) => {
    setSettings(next);
    saveLlmSettings(next);
  };

  const runParse = async () => {
    setError("");
    if (!settingsReady) {
      setError("Нужны Base URL и модель LLM (укажи в магическом вводе или здесь).");
      return;
    }
    if (!eventId) {
      setError("Выбери занятие");
      return;
    }
    if (photos.length === 0) {
      setError("Прикрепи хотя бы одно фото");
      return;
    }
    setProcessing(true);
    try {
      const response = await parseAttendancePhoto({
        baseUrl: settings.baseUrl,
        model: settings.model,
        apiKey: settings.apiKey,
        eventId,
        photos: photos.map((p) => ({ name: p.name, mimeType: p.mimeType, base64: p.base64 })),
      });
      setMatched(response.matched);
      setUnmatched(response.unmatched);
      setSelected(new Set(response.matched.filter((m) => m.signed).map((m) => m.userId)));
      if (response.matched.length === 0) {
        setError("LLM не распознала ни одного участника. Попробуй другую модель или более чёткое фото.");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обработать фото");
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelected = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const apply = async () => {
    setError("");
    setSaving(true);
    try {
      await markAttendance(eventId, [...selected]);
      setApplied(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить отметки");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setMatched([]);
    setUnmatched([]);
    setSelected(new Set());
    setPhotos([]);
    setApplied(false);
    setError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
      onClick={close}
    >
      <SurfaceCard
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ padding: 0 }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4 border-b"
          style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            Отметить посещаемость по фото
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Закрыть"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4" onClick={(event) => event.stopPropagation()}>
          <div>
            <label className="text-[13px] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Занятие
            </label>
            <select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-[14px] outline-none"
              style={{ borderColor: "var(--line-subtle)", background: "var(--bg-input)", color: "var(--text-primary)" }}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.date} · {event.startAt} · {event.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block">
              <span className="block text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
                Base URL LLM
              </span>
              <input
                type="url"
                value={settings.baseUrl}
                onChange={(event) => persistSettings({ ...settings, baseUrl: event.target.value })}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-[13.5px] font-mono outline-none"
                style={{ borderColor: "var(--line-subtle)", background: "var(--bg-input)", color: "var(--text-primary)" }}
              />
            </label>
            <label className="block">
              <span className="block text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
                Модель (с vision)
              </span>
              <input
                type="text"
                value={settings.model}
                onChange={(event) => persistSettings({ ...settings, model: event.target.value })}
                placeholder="anthropic/claude-3.5-sonnet"
                className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-[13.5px] outline-none"
                style={{ borderColor: "var(--line-subtle)", background: "var(--bg-input)", color: "var(--text-primary)" }}
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-[12px] mb-1" style={{ color: "var(--text-tertiary)" }}>
              API-ключ
            </span>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) => persistSettings({ ...settings, apiKey: event.target.value })}
              placeholder="sk-…"
              className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-[13.5px] outline-none"
              style={{ borderColor: "var(--line-subtle)", background: "var(--bg-input)", color: "var(--text-primary)" }}
            />
          </label>

          <div>
            <label className="text-[13px] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Фото листков (можно несколько)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className="text-[13px] flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] border cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ borderColor: "var(--line-subtle)", color: "var(--text-secondary)" }}
              >
                <ImageIcon size={14} /> Выбрать фото
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFiles}
                  className="hidden"
                />
              </label>
              {photos.map((photo, index) => (
                <span
                  key={`${photo.name}-${index}`}
                  className="inline-flex items-center gap-1 text-[12.5px] px-2 py-1 rounded-full"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                >
                  <Paperclip size={11} /> {photo.name}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="ml-0.5 opacity-70 hover:opacity-100"
                    aria-label="Удалить фото"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runParse}
              disabled={processing}
              className="text-[14px] px-4 py-2 rounded-[var(--radius-md)] flex items-center gap-1.5 transition-colors"
              style={{
                background: "var(--brand)",
                color: "var(--brand-contrast)",
                fontWeight: 600,
                opacity: processing ? 0.6 : 1,
              }}
            >
              {processing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {processing ? "Разбираю…" : "Распознать"}
            </button>
            {matched.length > 0 && !applied && (
              <button
                type="button"
                onClick={reset}
                className="text-[13px] px-3 py-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Сбросить
              </button>
            )}
          </div>

          {error && (
            <p className="text-[13px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          {matched.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>
                Распознано: {matched.length}
              </p>
              {matched.map((item) => {
                const on = selected.has(item.userId);
                return (
                  <button
                    key={item.userId}
                    type="button"
                    onClick={() => toggleSelected(item.userId)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] border text-left transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{
                      borderColor: on ? "var(--success)" : "var(--line-subtle)",
                      background: on ? "var(--success-soft)" : "var(--bg-card)",
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: on ? "var(--success)" : "var(--bg-subtle)",
                        color: on ? "var(--text-inverted)" : "var(--text-tertiary)",
                      }}
                    >
                      {on && <Check size={14} />}
                    </span>
                    <span className="flex-1 min-w-0 text-[14px]" style={{ color: "var(--text-primary)" }}>
                      {item.name}
                    </span>
                    {!item.signed && (
                      <span className="text-[11px]" style={{ color: "var(--warning)" }}>
                        без подписи?
                      </span>
                    )}
                  </button>
                );
              })}
              {unmatched.length > 0 && (
                <div
                  className="text-[12.5px] p-2.5 rounded-[var(--radius-md)]"
                  style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
                >
                  Не нашлись в системе: {unmatched.join(", ")}
                </div>
              )}
            </div>
          )}

          {applied && (
            <div
              className="text-[13px] p-3 rounded-[var(--radius-md)] flex items-center gap-2"
              style={{ background: "var(--success-soft)", color: "var(--success)" }}
            >
              <Check size={14} /> Отметки сохранены. Можно прикрепить ещё один листок или закрыть окно.
            </div>
          )}
        </div>

        <div
          className="px-5 py-4 border-t flex gap-3"
          style={{ borderColor: "var(--line-subtle)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={close}
            className="flex-1 h-[var(--button-height)] rounded-[var(--radius-lg)] text-[16px] transition-colors"
            style={{ background: "var(--bg-card)", border: "1px solid var(--text-primary)", color: "var(--text-primary)" }}
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={saving || selected.size === 0}
            className="flex-1 h-[var(--button-height)] rounded-[var(--radius-lg)] text-[16px] transition-colors"
            style={{
              background: "var(--brand)",
              color: "var(--brand-contrast)",
              fontWeight: 600,
              opacity: saving || selected.size === 0 ? 0.5 : 1,
            }}
          >
            {saving ? "Сохраняем…" : `Отметить (${selected.size})`}
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
}
