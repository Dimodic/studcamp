import type { AdminResourcePath, BootstrapPayload, LoginResponse, VisibilityMode } from "./domain";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api/v1";

/**
 * Ошибка API с пристёгнутым HTTP-статусом. Вызывающему коду иногда нужно
 * отличить 401 (протухшая сессия — можно тихо перелогиниться) от других
 * ошибок (показать тост, отрефрешить, что-то ещё).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function formatApiErrorDetail(detail: unknown): string | null {
  if (detail == null) {
    return null;
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object") {
          const candidate = item as { loc?: unknown; msg?: unknown };
          const path = Array.isArray(candidate.loc)
            ? candidate.loc
                .map((segment) => String(segment))
                .filter((segment) => segment !== "body")
                .join(".")
            : "";
          const message = typeof candidate.msg === "string" ? candidate.msg : JSON.stringify(item);
          return path ? `${path}: ${message}` : message;
        }
        return String(item);
      })
      .filter(Boolean);

    return parts.length > 0 ? parts.join("; ") : null;
  }

  if (typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch {
      return "Неизвестная ошибка";
    }
  }

  return typeof detail === "number" || typeof detail === "boolean" ? String(detail) : null;
}

function pickErrorField(body: unknown, key: "detail" | "message" | "error"): unknown {
  if (body && typeof body === "object" && key in body) {
    return (body as Record<string, unknown>)[key];
  }
  return undefined;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    const detail =
      pickErrorField(body, "detail") ??
      pickErrorField(body, "message") ??
      pickErrorField(body, "error");
    throw new ApiError(
      formatApiErrorDetail(detail) ?? "Не удалось выполнить запрос",
      response.status,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  telegramLogin(initData: string) {
    return request<LoginResponse>("/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ initData }),
    });
  },
  logout(token: string) {
    return request<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  getBootstrap(token: string) {
    return request<BootstrapPayload>("/bootstrap", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  markStoryRead(token: string, storyId: string) {
    return request<{ ok: boolean }>(`/stories/${storyId}/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  markUpdatesRead(token: string, updateIds: string[]) {
    return request<{ ok: boolean }>("/updates/mark-read", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ updateIds, markAll: updateIds.length === 0 }),
    });
  },
  saveProjectPriorities(token: string, projectIds: string[]) {
    return request<{ ok: boolean }>("/projects/preferences", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ projectIds }),
    });
  },
  updateProfilePreferences(
    token: string,
    payload: {
      visibilityMode?: VisibilityMode;
      notificationsOn?: boolean;
    },
  ) {
    return request<{ ok: boolean }>("/profile/preferences", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
  checkInEvent(token: string, eventId: string) {
    return request<{ ok: boolean }>(`/events/${eventId}/check-in`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ attendance: "confirmed" }),
    });
  },
  createAdminEntity(token: string, resource: AdminResourcePath, payload: unknown) {
    return request<{ ok: boolean; id: string }>(`/admin/${resource}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
  updateAdminEntity(
    token: string,
    resource: AdminResourcePath,
    entityId: string,
    payload: unknown,
  ) {
    return request<{ ok: boolean }>(`/admin/${resource}/${entityId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
  deleteAdminEntity(token: string, resource: AdminResourcePath, entityId: string) {
    return request<{ ok: boolean }>(`/admin/${resource}/${entityId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  parseLlmContent(
    token: string,
    payload: {
      baseUrl: string;
      model: string;
      apiKey: string;
      text: string;
      attachments: Array<{ name: string; mimeType: string; base64: string }>;
    },
  ) {
    return request<{ items: Array<{ kind: string; payload: Record<string, unknown> }> }>(
      `/llm/parse`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );
  },
  parseAttendancePhoto(
    token: string,
    payload: {
      baseUrl: string;
      model: string;
      apiKey: string;
      eventId: string;
      photos: Array<{ name: string; mimeType: string; base64: string }>;
    },
  ) {
    return request<{
      matched: Array<{ userId: string; name: string; signed: boolean }>;
      unmatched: string[];
    }>(`/admin/attendance/parse`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
  markAttendance(token: string, eventId: string, userIds: string[]) {
    return request<{ ok: boolean; marked: number }>(`/admin/attendance/mark`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ eventId, userIds }),
    });
  },
  getAttendanceMatrix(token: string) {
    return request<{
      cells: Array<{
        eventId: string;
        userId: string;
        status: string;
        source: string | null;
      }>;
    }>(`/admin/attendance/matrix`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  listCamps(token: string) {
    return request<{
      camps: Array<{
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
      }>;
    }>(`/admin/camps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  createCamp(
    token: string,
    payload: {
      name: string;
      shortDesc?: string | null;
      city: string;
      university: string;
      startDate: string;
      endDate: string;
      status: string;
      dayTitles?: Record<string, string> | null;
    },
  ) {
    return request<{ ok: boolean; id: string }>(`/admin/camps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },
  activateCamp(token: string, campId: string) {
    return request<{ ok: boolean }>(`/admin/camps/${campId}/activate`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  setAttendanceCell(
    token: string,
    payload: { eventId: string; userId: string; status: string | null },
  ) {
    return request<{
      eventId: string;
      userId: string;
      status: string;
      source: string | null;
    }>(`/admin/attendance/cell`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },
  setEntityVisibility(
    token: string,
    resource: AdminResourcePath,
    entityId: string,
    hidden: boolean,
  ) {
    return request<{ ok: boolean }>(`/admin/visibility/${resource}/${entityId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hidden }),
    });
  },
  setProjectPhase(token: string, phase: string) {
    return request<{ ok: boolean }>(`/admin/project-phase`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phase }),
    });
  },
  createProjectTeam(token: string, projectId: string) {
    return request<{ id: string; projectId: string; number: number }>(
      `/admin/projects/${projectId}/teams`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },
  deleteProjectTeam(token: string, teamId: string) {
    return request<{ ok: boolean }>(`/admin/teams/${teamId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  setProjectAssignment(token: string, userId: string, teamId: string | null) {
    return request<{ ok: boolean }>(`/admin/project-assignments`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, teamId }),
    });
  },
  autoDistributeAssignments(token: string) {
    return request<{ assigned: number; unassigned: string[] }>(`/admin/project-assignments/auto`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
