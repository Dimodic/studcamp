/**
 * Inline-панель LLM-парсера листков (бывшая модалка AttendanceUploader).
 * Организатор выбирает занятие, загружает фото, получает предложенный
 * список подписавшихся — и может сразу применить их как "confirmed".
 * Изменения сразу же отражаются в прилегающей AttendanceTable через
 * onApplied-колбек.
 */
import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { Check, ImagePlus, Loader2, X } from "lucide-react";

import { SurfaceCard } from "../common";
import { FieldLabel } from "../admin/form-primitives";
import { useAppData } from "../../lib/app-data";
import {
  DEFAULT_SETTINGS,
  loadLlmSettings,
  saveLlmSettings,
  type LlmSettings,
} from "../../lib/llm-settings";
import type { Event as CampEvent } from "../../lib/domain";

const INPUT_STYLE = {
  borderColor: "var(--line-subtle)",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
} as const;

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
  const [dragOver, setDragOver] = useState(false);

  const settingsReady = useMemo(
    () => Boolean(settings.baseUrl.trim() && settings.model.trim()),
    [settings],
  );

  const ingestFiles = async (files: File[]) => {
    const newPhotos: Photo[] = [];
    for (const file of files) {
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
    if (newPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    await ingestFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    await ingestFiles(Array.from(event.dataTransfer.files));
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
    <SurfaceCard className="p-5 sm:p-6 space-y-5">
      <div>
        <FieldLabel>Занятие</FieldLabel>
        <select
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none"
          style={INPUT_STYLE}
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.date} · {event.startAt} · {event.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel>{`Фото листков${photos.length > 0 ? ` · ${photos.length}` : ""}`}</FieldLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
          {photos.map((photo, index) => (
            <div
              key={`${photo.name}-${index}`}
              className="relative aspect-[4/3] rounded-[var(--radius-md)] overflow-hidden border"
              style={{ borderColor: "var(--line-subtle)", background: "var(--bg-subtle)" }}
            >
              <img
                src={`data:${photo.mimeType};base64,${photo.base64}`}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`Убрать ${photo.name}`}
                title="Убрать"
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
              >
                <X size={12} />
              </button>
              <div
                className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 text-[10px] truncate"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))",
                  color: "white",
                }}
              >
                {photo.name}
              </div>
            </div>
          ))}

          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => void handleDrop(event)}
            className="aspect-[4/3] rounded-[var(--radius-md)] border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-center px-2"
            style={{
              borderColor: dragOver ? "var(--brand)" : "var(--line-strong)",
              background: dragOver ? "var(--brand-soft)" : "var(--bg-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <ImagePlus size={22} />
            <span className="text-[12px]" style={{ fontWeight: 500 }}>
              {photos.length === 0 ? "Загрузить фото" : "Ещё фото"}
            </span>
            <span className="text-[10.5px]" style={{ color: "var(--text-tertiary)" }}>
              перетащите или кликните
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFiles}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <details className="group">
        <summary
          className="flex items-center gap-2 text-[12px] cursor-pointer select-none list-none"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span className="uppercase tracking-wider" style={{ fontWeight: 600 }}>
            Настройки LLM
          </span>
          <span className="opacity-60 group-open:rotate-90 transition-transform">›</span>
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5">
          <input
            type="url"
            value={settings.baseUrl}
            onChange={(event) => persistSettings({ ...settings, baseUrl: event.target.value })}
            placeholder="Base URL (https://…)"
            className="border rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-mono outline-none"
            style={INPUT_STYLE}
          />
          <input
            type="text"
            value={settings.model}
            onChange={(event) => persistSettings({ ...settings, model: event.target.value })}
            placeholder="Модель (с vision)"
            className="border rounded-[var(--radius-md)] px-3 py-2 text-[13px] outline-none"
            style={INPUT_STYLE}
          />
          <input
            type="password"
            value={settings.apiKey}
            onChange={(event) => persistSettings({ ...settings, apiKey: event.target.value })}
            placeholder="API-ключ"
            className="border rounded-[var(--radius-md)] px-3 py-2 text-[13px] outline-none"
            style={INPUT_STYLE}
          />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void runParse()}
          disabled={processing}
          className="inline-flex items-center gap-1.5 text-[14px] px-4 py-2.5 rounded-[var(--radius-md)] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "var(--brand)",
            color: "var(--brand-contrast)",
            fontWeight: 600,
          }}
        >
          {processing && <Loader2 size={14} className="animate-spin" />}
          {processing ? "Разбираю…" : "Распознать"}
        </button>
        {matched.length > 0 && (
          <button
            type="button"
            onClick={() => void apply()}
            disabled={saving || selected.size === 0}
            className="inline-flex items-center gap-1.5 text-[14px] px-4 py-2.5 rounded-[var(--radius-md)] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--success)",
              color: "var(--text-inverted)",
              fontWeight: 600,
            }}
          >
            {saving ? "Сохраняю…" : `Отметить ${selected.size}`}
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
