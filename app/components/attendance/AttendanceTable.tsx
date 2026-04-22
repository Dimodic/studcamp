/**
 * Матрица посещаемости: строки = участники, колонки = занятия.
 * Клик по ячейке переключает статус: not_checked → confirmed → pending → not_checked.
 * Sticky первая колонка (имя) + sticky шапка (дата/занятие).
 */
import { useMemo, useState } from "react";
import { Check, Clock, Minus } from "lucide-react";

import type { AdminUser, Event as CampEvent } from "../../lib/domain";

export type CellStatus = "confirmed" | "pending" | "not_checked";

type MatrixCell = { status: CellStatus; source: string | null };
export type MatrixState = Map<string, Map<string, MatrixCell>>; // eventId → userId → cell

interface Props {
  participants: AdminUser[];
  events: CampEvent[];
  matrix: MatrixState;
  onCellChange: (eventId: string, userId: string, nextStatus: CellStatus) => void;
  saving: Set<string>; // ключи вида `${eventId}:${userId}` — идёт запрос
}

const NEXT_STATUS: Record<CellStatus, CellStatus> = {
  not_checked: "confirmed",
  confirmed: "pending",
  pending: "not_checked",
};

function formatDay(event: CampEvent): string {
  const parsed = new Date(`${event.date}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return event.date;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
    .format(parsed)
    .replace(/\.$/, "");
}

export function AttendanceTable({ participants, events, matrix, onCellChange, saving }: Props) {
  const [filter, setFilter] = useState("");

  const countableEvents = useMemo(
    () => events.filter((event) => event.countsForAttendance !== false),
    [events],
  );

  const filteredParticipants = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return participants;
    return participants.filter((user) => user.name.toLowerCase().includes(query));
  }, [filter, participants]);

  // Сводка по каждому участнику: сколько confirmed из countable.
  const summary = useMemo(() => {
    const result = new Map<string, { present: number; total: number }>();
    for (const user of participants) {
      let present = 0;
      for (const event of countableEvents) {
        const status = matrix.get(event.id)?.get(user.id)?.status;
        if (status === "confirmed") present += 1;
      }
      result.set(user.id, { present, total: countableEvents.length });
    }
    return result;
  }, [participants, countableEvents, matrix]);

  if (participants.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
        В кемпе нет участников.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Поиск участника…"
          className="rounded-[var(--radius-md)] border px-3 py-2 text-[13.5px] outline-none"
          style={{
            borderColor: "var(--line-subtle)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            minWidth: 240,
          }}
        />
        <div className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {filteredParticipants.length} / {participants.length} участников ·{" "}
          {countableEvents.length} занятий с отметкой
        </div>
      </div>

      <div
        className="overflow-auto rounded-[var(--radius-md)] border"
        style={{ borderColor: "var(--line-subtle)", maxHeight: "70vh" }}
      >
        <table className="min-w-full text-[13px] border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th
                className="text-left px-3 py-2 sticky top-0 left-0 z-20"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--line-subtle)",
                  borderRight: "1px solid var(--line-subtle)",
                  minWidth: 220,
                }}
              >
                Участник
              </th>
              <th
                className="px-3 py-2 sticky top-0 z-10 whitespace-nowrap"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-tertiary)",
                  borderBottom: "1px solid var(--line-subtle)",
                  borderRight: "1px solid var(--line-subtle)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Явка
              </th>
              {countableEvents.map((event) => (
                <th
                  key={event.id}
                  title={`${event.title} · ${event.date} ${event.startAt}`}
                  className="px-2 py-2 sticky top-0 z-10 text-center"
                  style={{
                    background: "var(--bg-card)",
                    color: "var(--text-secondary)",
                    borderBottom: "1px solid var(--line-subtle)",
                    borderRight: "1px solid var(--line-subtle)",
                    minWidth: 72,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-wider">{formatDay(event)}</div>
                  <div
                    className="text-[11px] mt-0.5 truncate"
                    style={{ maxWidth: 90, color: "var(--text-tertiary)" }}
                  >
                    {event.startAt}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((user, rowIndex) => {
              const userSummary = summary.get(user.id) ?? { present: 0, total: 0 };
              return (
                <tr key={user.id}>
                  <td
                    className="px-3 py-2 sticky left-0 z-10"
                    style={{
                      background: rowIndex % 2 === 0 ? "var(--bg-card)" : "var(--bg-subtle)",
                      color: "var(--text-primary)",
                      borderBottom: "1px solid var(--line-subtle)",
                      borderRight: "1px solid var(--line-subtle)",
                      fontWeight: 500,
                    }}
                  >
                    <div className="truncate" style={{ maxWidth: 280 }}>
                      {user.name}
                    </div>
                    {user.university && (
                      <div
                        className="text-[11px] truncate"
                        style={{ color: "var(--text-tertiary)", maxWidth: 280 }}
                      >
                        {user.university}
                      </div>
                    )}
                  </td>
                  <td
                    className="px-3 py-2 text-center"
                    style={{
                      background: rowIndex % 2 === 0 ? "var(--bg-card)" : "var(--bg-subtle)",
                      borderBottom: "1px solid var(--line-subtle)",
                      borderRight: "1px solid var(--line-subtle)",
                      fontWeight: 600,
                      color:
                        userSummary.total > 0 && userSummary.present / userSummary.total >= 0.9
                          ? "var(--success)"
                          : "var(--text-primary)",
                    }}
                  >
                    {userSummary.present}/{userSummary.total}
                  </td>
                  {countableEvents.map((event) => {
                    const cellKey = `${event.id}:${user.id}`;
                    const cell = matrix.get(event.id)?.get(user.id) ?? {
                      status: "not_checked" as CellStatus,
                      source: null,
                    };
                    const isSaving = saving.has(cellKey);
                    return (
                      <CellButton
                        key={cellKey}
                        status={cell.status}
                        source={cell.source}
                        isSaving={isSaving}
                        rowEven={rowIndex % 2 === 0}
                        onClick={() => onCellChange(event.id, user.id, NEXT_STATUS[cell.status])}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="flex flex-wrap items-center gap-4 text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <LegendItem status="confirmed" label="Присутствовал" />
        <LegendItem status="pending" label="Проверяется" />
        <LegendItem status="not_checked" label="Не отмечен" />
        <span>Клик по ячейке переключает по циклу.</span>
      </div>
    </div>
  );
}

interface CellButtonProps {
  status: CellStatus;
  source: string | null;
  isSaving: boolean;
  rowEven: boolean;
  onClick: () => void;
}

function CellButton({ status, source, isSaving, rowEven, onClick }: CellButtonProps) {
  const visual = CELL_VISUAL[status];
  const bg = isSaving
    ? "var(--bg-subtle)"
    : (visual.bg ?? (rowEven ? "var(--bg-card)" : "var(--bg-subtle)"));
  const Icon = visual.icon;
  const sourceSuffix = source === "sheet" ? " · листок" : source === "self" ? " · сам" : "";
  return (
    <td
      style={{
        background: bg,
        borderBottom: "1px solid var(--line-subtle)",
        borderRight: "1px solid var(--line-subtle)",
        padding: 0,
        textAlign: "center",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        title={`${visual.label}${sourceSuffix}`}
        className="w-full h-full px-2 py-2 inline-flex items-center justify-center transition-colors"
        style={{
          color: visual.color,
          cursor: isSaving ? "wait" : "pointer",
          opacity: isSaving ? 0.5 : 1,
        }}
      >
        {Icon && <Icon size={16} strokeWidth={2.2} />}
      </button>
    </td>
  );
}

const CELL_VISUAL: Record<
  CellStatus,
  { label: string; icon: typeof Check | null; color: string; bg: string | null }
> = {
  confirmed: {
    label: "Присутствовал",
    icon: Check,
    color: "var(--success)",
    bg: "var(--success-soft)",
  },
  pending: {
    label: "Проверяется",
    icon: Clock,
    color: "var(--warning)",
    bg: "var(--warning-soft)",
  },
  not_checked: {
    label: "Не отмечен",
    icon: Minus,
    color: "var(--text-tertiary)",
    bg: null,
  },
};

function LegendItem({ status, label }: { status: CellStatus; label: string }) {
  const visual = CELL_VISUAL[status];
  const Icon = visual.icon;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-5 h-5 rounded-[var(--radius-sm)] inline-flex items-center justify-center"
        style={{ background: visual.bg ?? "var(--bg-subtle)", color: visual.color }}
      >
        {Icon && <Icon size={12} strokeWidth={2.4} />}
      </span>
      {label}
    </span>
  );
}
