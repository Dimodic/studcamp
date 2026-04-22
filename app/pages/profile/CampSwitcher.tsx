/**
 * Модалка переключения кемпов для организатора. Показывает список всех
 * кемпов, позволяет создать новый и активировать выбранный. Активный
 * кемп — тот, что видят все участники и преподаватели; при активации
 * другого — переключение мгновенное для всех.
 *
 * Сначала организатор выбирает кемп («просмотр»), видит его детали —
 * потом подтверждает «Сделать активным». Это не трогает БД до явного
 * подтверждения.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MapPin, Plus, Users, X } from "lucide-react";

import { SurfaceCard } from "../../components/common";
import { FieldLabel } from "../../components/admin/form-primitives";
import { useAppData } from "../../lib/app-data";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

const INPUT_STYLE = {
  borderColor: "var(--line-subtle)",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
} as const;

interface CampItem {
  id: string;
  name: string;
  shortDesc: string | null;
  city: string;
  university: string;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
  participantsCount: number;
  eventsCount: number;
}

interface Props {
  open: boolean;
  currentCampId: string;
  onClose: () => void;
}

type Mode = "list" | "create";

function formatDates(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return `${start} — ${end}`;
  }
  const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const yearFmt = new Intl.DateTimeFormat("ru-RU", { year: "numeric" });
  return `${dayMonth.format(startDate)} — ${dayMonth.format(endDate)} ${yearFmt.format(endDate)}`;
}

export function CampSwitcher({ open, currentCampId, onClose }: Props) {
  const { listCamps, createCamp, activateCamp } = useAppData();
  const [mode, setMode] = useState<Mode>("list");
  const [camps, setCamps] = useState<CampItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Форма создания нового кемпа.
  const [formName, setFormName] = useState("");
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formUniversity, setFormUniversity] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  useBodyScrollLock(open);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listCamps();
      setCamps(list);
      const activeId = list.find((c) => c.isActive)?.id ?? currentCampId;
      setSelectedId(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить список кемпов");
    } finally {
      setLoading(false);
    }
  }, [listCamps, currentCampId]);

  useEffect(() => {
    if (open) {
      setMode("list");
      void load();
    }
  }, [open, load]);

  if (!open) return null;

  const selected = selectedId ? camps.find((c) => c.id === selectedId) : null;
  const canActivate = selected !== undefined && selected !== null && !selected.isActive;

  const handleActivate = async () => {
    if (!selected || selected.isActive) return;
    if (
      !window.confirm(
        `Переключить всех участников на «${selected.name}»? Текущий активный кемп перестанет отображаться у них.`,
      )
    ) {
      return;
    }
    setActivatingId(selected.id);
    setError("");
    try {
      await activateCamp(selected.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось активировать кемп");
    } finally {
      setActivatingId(null);
    }
  };

  const handleCreate = async () => {
    setError("");
    if (!formName.trim() || !formCity.trim() || !formUniversity.trim()) {
      setError("Нужно указать название, город и вуз");
      return;
    }
    if (!formStartDate || !formEndDate) {
      setError("Укажи даты начала и окончания");
      return;
    }
    if (formStartDate > formEndDate) {
      setError("Дата окончания должна быть позже начала");
      return;
    }
    setCreating(true);
    try {
      const id = await createCamp({
        name: formName.trim(),
        shortDesc: formShortDesc.trim() || null,
        city: formCity.trim(),
        university: formUniversity.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        status: "upcoming",
      });
      // Сбрасываем форму и возвращаемся к списку с уже выбранным новым кемпом.
      setFormName("");
      setFormShortDesc("");
      setFormCity("");
      setFormUniversity("");
      setFormStartDate("");
      setFormEndDate("");
      setMode("list");
      await load();
      setSelectedId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать кемп");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <SurfaceCard
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ padding: 0 }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {mode === "list" ? "Кемпы" : "Новый кемп"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          onClick={(event) => event.stopPropagation()}
        >
          {error && (
            <p
              className="text-[13px] p-2.5 rounded-[var(--radius-md)]"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          {mode === "list" ? (
            <>
              {loading ? (
                <div
                  className="flex items-center gap-2 text-[13px] py-6 justify-center"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <Loader2 size={14} className="animate-spin" /> Загружаю…
                </div>
              ) : camps.length === 0 ? (
                <p
                  className="text-[13px] py-4 text-center"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Кемпов пока нет. Создайте первый.
                </p>
              ) : (
                <div className="space-y-2">
                  {camps.map((camp) => {
                    const isSelected = camp.id === selectedId;
                    return (
                      <button
                        key={camp.id}
                        type="button"
                        onClick={() => setSelectedId(camp.id)}
                        className="w-full text-left p-4 rounded-[var(--radius-md)] border transition-colors"
                        style={{
                          borderColor: isSelected ? "var(--brand)" : "var(--line-subtle)",
                          borderWidth: isSelected ? 2 : 1,
                          background: "var(--bg-card)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className="text-[15px] leading-snug"
                                style={{ color: "var(--text-primary)", fontWeight: 600 }}
                              >
                                {camp.name}
                              </p>
                              {camp.isActive && (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                                  style={{
                                    background: "var(--success-soft)",
                                    color: "var(--success)",
                                    fontWeight: 600,
                                  }}
                                >
                                  <Check size={11} strokeWidth={3} /> Активен
                                </span>
                              )}
                            </div>
                            {camp.shortDesc && (
                              <p
                                className="text-[13px] mt-0.5"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {camp.shortDesc}
                              </p>
                            )}
                            <div
                              className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] mt-1.5"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={12} /> {camp.city}
                              </span>
                              <span>{camp.university}</span>
                              <span>{formatDates(camp.startDate, camp.endDate)}</span>
                              <span className="inline-flex items-center gap-1">
                                <Users size={12} /> {camp.participantsCount}
                              </span>
                              <span>{camp.eventsCount} занятий</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <FieldLabel>Название</FieldLabel>
                <input
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Например, Алгоритмы осень 2026"
                  className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <FieldLabel>Короткое описание</FieldLabel>
                <input
                  type="text"
                  value={formShortDesc}
                  onChange={(event) => setFormShortDesc(event.target.value)}
                  placeholder="Необязательно"
                  className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none"
                  style={INPUT_STYLE}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Город</FieldLabel>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(event) => setFormCity(event.target.value)}
                    placeholder="Москва"
                    className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Вуз / организация</FieldLabel>
                  <input
                    type="text"
                    value={formUniversity}
                    onChange={(event) => setFormUniversity(event.target.value)}
                    placeholder="Яндекс Образование"
                    className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Дата начала</FieldLabel>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(event) => setFormStartDate(event.target.value)}
                    className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <FieldLabel>Дата окончания</FieldLabel>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(event) => setFormEndDate(event.target.value)}
                    className="w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Новый кемп создаётся неактивным. После создания его можно активировать — тогда все
                участники и преподаватели увидят именно его вместо текущего.
              </p>
            </div>
          )}
        </div>

        <div
          className="px-5 py-4 border-t flex flex-wrap gap-2 justify-between shrink-0"
          style={{ borderColor: "var(--line-subtle)" }}
          onClick={(event) => event.stopPropagation()}
        >
          {mode === "list" ? (
            <>
              <button
                type="button"
                onClick={() => setMode("create")}
                className="inline-flex items-center gap-1.5 text-[14px] px-4 py-2.5 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-subtle)]"
                style={{
                  border: "1px solid var(--line-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                <Plus size={15} /> Создать кемп
              </button>
              <button
                type="button"
                onClick={() => void handleActivate()}
                disabled={!canActivate || activatingId !== null}
                className="inline-flex items-center gap-1.5 text-[14px] px-4 py-2.5 rounded-[var(--radius-md)] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--brand)",
                  color: "var(--brand-contrast)",
                  fontWeight: 600,
                }}
              >
                {activatingId && <Loader2 size={14} className="animate-spin" />}
                {selected?.isActive ? "Уже активен" : "Сделать активным"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode("list")}
                className="inline-flex items-center text-[14px] px-4 py-2.5 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-subtle)]"
                style={{
                  border: "1px solid var(--line-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="inline-flex items-center gap-1.5 text-[14px] px-4 py-2.5 rounded-[var(--radius-md)] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--brand)",
                  color: "var(--brand-contrast)",
                  fontWeight: 600,
                }}
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                {creating ? "Создаём…" : "Создать"}
              </button>
            </>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
