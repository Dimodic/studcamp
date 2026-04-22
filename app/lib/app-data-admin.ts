/**
 * Admin-сторона app-data: CRUD для всех управляемых сущностей + управление
 * фазой проектов + назначение команд + LLM-парсеры + посещаемость.
 *
 * Выделено из основного провайдера, чтобы app-data.tsx сосредоточился на
 * аутентификации, синхронизации и пользовательских мутациях. Хук принимает
 * token-доступ и refresh-функцию из родительского провайдера.
 */
import { useCallback } from "react";

import { api } from "./api";
import type { AdminResourcePath } from "./domain";

export interface LlmParseInput {
  baseUrl: string;
  model: string;
  apiKey: string;
  text: string;
  attachments: Array<{ name: string; mimeType: string; base64: string }>;
}

export interface AttendancePhotoInput {
  baseUrl: string;
  model: string;
  apiKey: string;
  eventId: string;
  photos: Array<{ name: string; mimeType: string; base64: string }>;
}

export interface AdminActions {
  createAdminEntity: (resource: AdminResourcePath, payload: unknown) => Promise<string>;
  updateAdminEntity: (
    resource: AdminResourcePath,
    entityId: string,
    payload: unknown,
  ) => Promise<void>;
  deleteAdminEntity: (resource: AdminResourcePath, entityId: string) => Promise<void>;
  parseLlmContent: (
    input: LlmParseInput,
  ) => Promise<Array<{ kind: string; payload: Record<string, unknown> }>>;
  parseAttendancePhoto: (input: AttendancePhotoInput) => Promise<{
    matched: Array<{ userId: string; name: string; signed: boolean }>;
    unmatched: string[];
  }>;
  markAttendance: (eventId: string, userIds: string[]) => Promise<void>;
  getAttendanceMatrix: () => Promise<
    Array<{ eventId: string; userId: string; status: string; source: string | null }>
  >;
  setAttendanceCell: (
    eventId: string,
    userId: string,
    status: "confirmed" | "pending" | null,
  ) => Promise<{ status: string }>;
  setEntityVisibility: (
    resource: AdminResourcePath,
    entityId: string,
    hidden: boolean,
  ) => Promise<void>;
  setProjectPhase: (phase: string) => Promise<void>;
  createProjectTeam: (
    projectId: string,
  ) => Promise<{ id: string; projectId: string; number: number }>;
  deleteProjectTeam: (teamId: string) => Promise<void>;
  setProjectAssignment: (userId: string, teamId: string | null) => Promise<void>;
  autoDistributeAssignments: () => Promise<{ assigned: number; unassigned: string[] }>;
}

interface AdminDeps {
  requireToken: () => string;
  refresh: () => Promise<void>;
  setError: (message: string | null) => void;
}

export function useAdminActions({ requireToken, refresh, setError }: AdminDeps): AdminActions {
  const createAdminEntity = useCallback<AdminActions["createAdminEntity"]>(
    async (resource, payload) => {
      const authToken = requireToken();
      try {
        const response = await api.createAdminEntity(authToken, resource, payload);
        await refresh();
        return response.id;
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось создать запись");
        throw nextError;
      }
    },
    [refresh, requireToken, setError],
  );

  const updateAdminEntity = useCallback<AdminActions["updateAdminEntity"]>(
    async (resource, entityId, payload) => {
      const authToken = requireToken();
      try {
        await api.updateAdminEntity(authToken, resource, entityId, payload);
        await refresh();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось обновить запись");
        throw nextError;
      }
    },
    [refresh, requireToken, setError],
  );

  const deleteAdminEntity = useCallback<AdminActions["deleteAdminEntity"]>(
    async (resource, entityId) => {
      const authToken = requireToken();
      try {
        await api.deleteAdminEntity(authToken, resource, entityId);
        await refresh();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось удалить запись");
        throw nextError;
      }
    },
    [refresh, requireToken, setError],
  );

  const parseLlmContent = useCallback<AdminActions["parseLlmContent"]>(
    async (input) => {
      const authToken = requireToken();
      const response = await api.parseLlmContent(authToken, input);
      return response.items;
    },
    [requireToken],
  );

  const parseAttendancePhoto = useCallback<AdminActions["parseAttendancePhoto"]>(
    async (input) => {
      const authToken = requireToken();
      return await api.parseAttendancePhoto(authToken, input);
    },
    [requireToken],
  );

  const markAttendance = useCallback<AdminActions["markAttendance"]>(
    async (eventId, userIds) => {
      const authToken = requireToken();
      await api.markAttendance(authToken, eventId, userIds);
      await refresh();
    },
    [refresh, requireToken],
  );

  const getAttendanceMatrix = useCallback<AdminActions["getAttendanceMatrix"]>(async () => {
    const authToken = requireToken();
    const response = await api.getAttendanceMatrix(authToken);
    return response.cells;
  }, [requireToken]);

  const setAttendanceCell = useCallback<AdminActions["setAttendanceCell"]>(
    async (eventId, userId, status) => {
      const authToken = requireToken();
      const response = await api.setAttendanceCell(authToken, { eventId, userId, status });
      // Обновлять bootstrap не нужно — страница посещаемости управляет
      // локальным состоянием матрицы сама. Для текущего юзера это тоже
      // не критично (статус в bootstrap заполняется только для него).
      return { status: response.status };
    },
    [requireToken],
  );

  const setEntityVisibility = useCallback<AdminActions["setEntityVisibility"]>(
    async (resource, entityId, hidden) => {
      const authToken = requireToken();
      try {
        await api.setEntityVisibility(authToken, resource, entityId, hidden);
        await refresh();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось изменить видимость");
        throw nextError;
      }
    },
    [refresh, requireToken, setError],
  );

  const setProjectPhase = useCallback<AdminActions["setProjectPhase"]>(
    async (phase) => {
      const authToken = requireToken();
      await api.setProjectPhase(authToken, phase);
      await refresh();
    },
    [refresh, requireToken],
  );

  const createProjectTeam = useCallback<AdminActions["createProjectTeam"]>(
    async (projectId) => {
      const authToken = requireToken();
      const team = await api.createProjectTeam(authToken, projectId);
      await refresh();
      return team;
    },
    [refresh, requireToken],
  );

  const deleteProjectTeam = useCallback<AdminActions["deleteProjectTeam"]>(
    async (teamId) => {
      const authToken = requireToken();
      await api.deleteProjectTeam(authToken, teamId);
      await refresh();
    },
    [refresh, requireToken],
  );

  const setProjectAssignment = useCallback<AdminActions["setProjectAssignment"]>(
    async (userId, teamId) => {
      const authToken = requireToken();
      await api.setProjectAssignment(authToken, userId, teamId);
      await refresh();
    },
    [refresh, requireToken],
  );

  const autoDistributeAssignments = useCallback<
    AdminActions["autoDistributeAssignments"]
  >(async () => {
    const authToken = requireToken();
    const response = await api.autoDistributeAssignments(authToken);
    await refresh();
    return response;
  }, [refresh, requireToken]);

  return {
    createAdminEntity,
    updateAdminEntity,
    deleteAdminEntity,
    parseLlmContent,
    parseAttendancePhoto,
    markAttendance,
    getAttendanceMatrix,
    setAttendanceCell,
    setEntityVisibility,
    setProjectPhase,
    createProjectTeam,
    deleteProjectTeam,
    setProjectAssignment,
    autoDistributeAssignments,
  };
}
