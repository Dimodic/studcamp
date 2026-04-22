/**
 * Страница посещаемости для организатора.
 *   - LLM-панель сверху: выбор занятия + загрузка фото + распознавание.
 *   - Таблица снизу: ручная правка, клик переключает статус ячейки.
 * Матрица загружается при монтировании, оптимистично обновляется при
 * правке и LLM-применении.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { PageShell, SurfaceCard } from "../../components/common";
import { useAppData } from "../../lib/app-data";
import { AttendanceLlmPanel } from "./AttendanceLlmPanel";
import { AttendanceTable, type CellStatus, type MatrixState } from "./AttendanceTable";

export function AttendancePage() {
  const { data, getAttendanceMatrix, setAttendanceCell } = useAppData();
  const [matrix, setMatrix] = useState<MatrixState>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const participants = useMemo(
    () => (data ? data.adminUsers.filter((user) => user.role === "participant") : []),
    [data],
  );
  const events = useMemo(() => (data ? data.events : []), [data]);
  const countableEvents = useMemo(
    () => events.filter((event) => event.countsForAttendance !== false),
    [events],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cells = await getAttendanceMatrix();
      const next: MatrixState = new Map();
      for (const cell of cells) {
        if (!next.has(cell.eventId)) next.set(cell.eventId, new Map());
        next.get(cell.eventId)!.set(cell.userId, {
          status: cell.status as CellStatus,
          source: cell.source,
        });
      }
      setMatrix(next);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Не удалось загрузить посещаемость",
      );
    } finally {
      setLoading(false);
    }
  }, [getAttendanceMatrix]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCellChange = useCallback(
    async (eventId: string, userId: string, nextStatus: CellStatus) => {
      const cellKey = `${eventId}:${userId}`;
      setSaving((prev) => new Set(prev).add(cellKey));
      const prevCell = matrix.get(eventId)?.get(userId);
      setMatrix((prev) => {
        const next = new Map(prev);
        const eventMap = new Map(next.get(eventId) ?? []);
        if (nextStatus === "not_checked") {
          eventMap.delete(userId);
        } else {
          eventMap.set(userId, { status: nextStatus, source: "manual" });
        }
        next.set(eventId, eventMap);
        return next;
      });
      try {
        await setAttendanceCell(eventId, userId, nextStatus === "not_checked" ? null : nextStatus);
      } catch (nextError) {
        setMatrix((prev) => {
          const next = new Map(prev);
          const eventMap = new Map(next.get(eventId) ?? []);
          if (prevCell) eventMap.set(userId, prevCell);
          else eventMap.delete(userId);
          next.set(eventId, eventMap);
          return next;
        });
        setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить отметку");
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      }
    },
    [matrix, setAttendanceCell],
  );

  const handleLlmApplied = useCallback((eventId: string, userIds: string[]) => {
    setMatrix((prev) => {
      const next = new Map(prev);
      const eventMap = new Map(next.get(eventId) ?? []);
      for (const userId of userIds) {
        eventMap.set(userId, { status: "confirmed", source: "sheet" });
      }
      next.set(eventId, eventMap);
      return next;
    });
  }, []);

  if (!data) return null;
  if (!data.currentUser.capabilities.canManageUsers) {
    return (
      <PageShell size="wide">
        <div className="px-5 pt-5">
          <SurfaceCard className="p-6">
            <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
              Раздел посещаемости доступен только организаторам.
            </p>
          </SurfaceCard>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-[var(--text-primary)]">Посещаемость</h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-tertiary)" }}>
          {participants.length} участников · {countableEvents.length} занятий с отметкой
        </p>
      </div>

      <div className="px-5 pb-6">
        <AttendanceLlmPanel events={countableEvents} onApplied={handleLlmApplied} />
      </div>

      <div className="px-5 pb-8">
        {loading ? (
          <SurfaceCard className="p-6">
            <div
              className="flex items-center gap-2 text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Loader2 size={14} className="animate-spin" /> Загружаю матрицу…
            </div>
          </SurfaceCard>
        ) : (
          <>
            {error && (
              <p
                className="text-[13px] mb-3 p-2.5 rounded-[var(--radius-md)]"
                style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                {error}
              </p>
            )}
            <AttendanceTable
              participants={participants}
              events={events}
              matrix={matrix}
              onCellChange={(eventId, userId, nextStatus) =>
                void handleCellChange(eventId, userId, nextStatus)
              }
              saving={saving}
            />
          </>
        )}
      </div>
    </PageShell>
  );
}
