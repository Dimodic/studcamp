import type { AdminResourcePath, BootstrapPayload, LoginResponse, VisibilityMode } from "./domain";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api/v1";

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
      return String(detail);
    }
  }

  return String(detail);
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
    const body = await response.json().catch(() => ({}));
    throw new Error(
      formatApiErrorDetail(body.detail ?? body.message ?? body.error) ?? "Не удалось выполнить запрос",
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
  updateAdminEntity(token: string, resource: AdminResourcePath, entityId: string, payload: unknown) {
    return request<{ ok: boolean }>(`/admin/${resource}/${entityId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
};
