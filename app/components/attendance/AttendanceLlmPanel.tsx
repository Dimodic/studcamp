/**
 * Inline-панель LLM-парсера листков (бывшая модалка AttendanceUploader).
 * Организатор выбирает занятие, загружает фото, получает предложенный
 * список подписавшихся — и может сразу применить их как "confirmed".
 * Изменения сразу же отражаются в прилегающей AttendanceTable через
 * onApplied-колбек.
 */
import { useMemo, useState, type ChangeEvent } from "react";
import { Check, ImageIcon, Loader2, Paperclip, Sparkles, X } from "lucide-react";

import { SurfaceCard } from "../common";
import { useAppData } from "../../lib/app-data";
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

interface Props {
  events: CampEvent[];
  defaultEventId?: string;
  onApplied: (eventId: string, userIds: string[]) => void;
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

export function AttendanceLlmPanel({ events, defaultEventId, onApplied }: Props) {
  const { parseAttendancePhoto, markAttendance } = useAppData();
  const [settings, setSettings] = useState<LlmSettings>(
    () => loadLlmSettings() ?? DEFAULT_SETTINGS,
  );
  const [eventId, setEventId] = useState<string>(defaultEventId ?? events[0]?.id ?? "");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState<Matched[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [appliedMessage, setAppliedMessage] = useState("");

  const settingsReady = useMemo(
    () => Boolean(settings.baseUrl.trim() && settings.model.trim()),
    [settings],
  );

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files ?? []);
    const newPhotos: Photo[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} не похоже на картинку`);
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

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const persistSettings = (next: LlmSettings) => {
    setSettings(next);
    saveLlmSettings(next);
  };

  const runParse = async () => {
    setError("");
    setAppliedMessage("");
    if (!settingsReady) {
      setError("Нужны Base URL и модель LLM.");
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
        setError("LLM не распознала ни одного участника. Попробуй другую модель или чёткое фото.");
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
      const userIds = [...selected];
      await markAttendance(eventId, userIds);
      onApplied(eventId, userIds);
      setAppliedMessage(
        `Отмечено ${userIds.length}. Таблица справа обновлена — можно править вручную.`,
      );
      setMatched([]);
      setUnmatched([]);
      setSelected(new Set());
      setPhotos([]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить отметки");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SurfaceCard className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} style={{ color: "var(--brand)" }} />
        <h2 className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          Распознать листок LLM
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="text-[12px] block mb-1" style={{ color: "var(--text-tertiary)" }}>
            Занятие
          </label>
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border px-3 py-2 text-[14px] outline-none"
            style={{
              borderColor: "var(--line-subtle)",
              background: "var(--bg-input)",
              color: "var(--text-primary)",
            }}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.date} · {event.startAt} · {event.title}
              </option>
            ))}
          </select>
        </div>
        <label
          className="text-[13px] flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] border cursor-pointer transition-colors hover:bg-[var(--bg-subtle)] h-[42px]"
          style={{ borderColor: "var(--line-subtle)", color: "var(--text-secondary)" }}
        >
          <ImageIcon size={14} /> Добавить фото
          <input type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
        </label>
      </div>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {photos.map((photo, index) => (
            <span
              key={`${photo.name}-${index}`}
              className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full"
              style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
            >
              <Paperclip size={10} /> {photo.name}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="ml-0.5 opacity-70 hover:opacity-100"
                aria-label="Убрать фото"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="url"
          value={settings.baseUrl}
          onChange={(event) => persistSettings({ ...settings, baseUrl: event.target.value })}
          placeholder="Base URL (https://…)"
          className="rounded-[var(--radius-sm)] border px-3 py-2 text-[13px] font-mono outline-none"
          style={{
            borderColor: "var(--line-subtle)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
          }}
        />
        <input
          type="text"
          value={settings.model}
          onChange={(event) => persistSettings({ ...settings, model: event.target.value })}
          placeholder="Модель (с vision)"
          className="rounded-[var(--radius-sm)] border px-3 py-2 text-[13px] outline-none"
          style={{
            borderColor: "var(--line-subtle)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
          }}
        />
        <input
          type="password"
          value={settings.apiKey}
          onChange={(event) => persistSettings({ ...settings, apiKey: event.target.value })}
          placeholder="API-ключ"
          className="rounded-[var(--radius-sm)] border px-3 py-2 text-[13px] outline-none"
          style={{
            borderColor: "var(--line-subtle)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void runParse()}
          disabled={processing}
          className="text-[14px] px-4 py-2 rounded-[var(--radius-md)] flex items-center gap-1.5"
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
        {matched.length > 0 && (
          <button
            type="button"
            onClick={() => void apply()}
            disabled={saving || selected.size === 0}
            className="text-[14px] px-4 py-2 rounded-[var(--radius-md)]"
            style={{
              background: "var(--success)",
              color: "var(--text-inverted)",
              fontWeight: 600,
              opacity: saving || selected.size === 0 ? 0.5 : 1,
            }}
          >
            {saving ? "Сохраняю…" : `Отметить (${selected.size})`}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[13px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {appliedMessage && (
        <p
          className="text-[13px] p-2.5 rounded-[var(--radius-md)] flex items-center gap-2"
          style={{ background: "var(--success-soft)", color: "var(--success)" }}
        >
          <Check size={14} /> {appliedMessage}
        </p>
      )}

      {matched.length > 0 && (
        <div className="space-y-1.5">
          <p
            className="text-[11px] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
          >
            LLM распознала ({matched.length}) — сними галочки для ошибок
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {matched.map((item) => {
              const on = selected.has(item.userId);
              return (
                <button
                  key={item.userId}
                  type="button"
                  onClick={() => toggleSelected(item.userId)}
                  className="flex items-center gap-2 p-2 rounded-[var(--radius-md)] border text-left text-[13px]"
                  style={{
                    borderColor: on ? "var(--success)" : "var(--line-subtle)",
                    background: on ? "var(--success-soft)" : "var(--bg-card)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: on ? "var(--success)" : "var(--bg-subtle)",
                      color: on ? "var(--text-inverted)" : "var(--text-tertiary)",
                    }}
                  >
                    {on && <Check size={12} />}
                  </span>
                  <span className="flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
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
          </div>
          {unmatched.length > 0 && (
            <div
              className="text-[12px] p-2 rounded-[var(--radius-md)]"
              style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
            >
              Не нашлись в системе: {unmatched.join(", ")}
            </div>
          )}
        </div>
      )}
    </SurfaceCard>
  );
}
