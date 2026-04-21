import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { cacheStorage } from "./cache";
import type { AdminResourcePath, BootstrapPayload, Event, VisibilityMode } from "./domain";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
type SyncStatus = "idle" | "syncing" | "fresh" | "stale" | "error";

interface ProfilePreferencesInput {
  visibilityMode?: VisibilityMode;
  notificationsOn?: boolean;
}

interface AppDataContextValue {
  status: AuthStatus;
  syncStatus: SyncStatus;
  data: BootstrapPayload | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  markStoryRead: (storyId: string) => Promise<void>;
  markUpdatesRead: (updateIds?: string[]) => Promise<void>;
  saveProjectPriorities: (projectIds: string[]) => Promise<void>;
  updateProfilePreferences: (payload: ProfilePreferencesInput) => Promise<void>;
  checkInEvent: (eventId: string) => Promise<void>;
  createAdminEntity: (resource: AdminResourcePath, payload: unknown) => Promise<string>;
  updateAdminEntity: (resource: AdminResourcePath, entityId: string, payload: unknown) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const DEFAULT_CAPABILITIES = {
  canManageAll: false,
  canCreateEvents: false,
  canEditAllEvents: false,
  canEditOwnEvents: false,
  canManageUsers: false,
  canManageStories: false,
  canManageUpdates: false,
  canManageProjects: false,
  canManageMaterials: false,
  canManageResources: false,
  canManageCampus: false,
  canManageDocuments: false,
  canManageRooms: false,
  canAssignTeachers: false,
};

function normalizeBootstrap(bootstrap: BootstrapPayload): BootstrapPayload {
  return {
    ...bootstrap,
    currentUser: {
      ...bootstrap.currentUser,
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        ...bootstrap.currentUser.capabilities,
      },
    },
    events: bootstrap.events.map((event) => ({
      ...event,
      teacherIds: event.teacherIds ?? [],
    })),
    adminUsers: bootstrap.adminUsers ?? [],
    adminDocuments: bootstrap.adminDocuments ?? [],
    adminRoomAssignments: bootstrap.adminRoomAssignments ?? [],
  };
}

function touchBootstrap(bootstrap: BootstrapPayload): BootstrapPayload {
  return normalizeBootstrap({
    ...bootstrap,
    lastSyncedAt: new Date().toISOString(),
  });
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const persistBootstrap = useCallback(async (bootstrap: BootstrapPayload | null) => {
    const normalized = bootstrap ? normalizeBootstrap(bootstrap) : null;
    setData(normalized);
    if (normalized) {
      await cacheStorage.setBootstrap(normalized);
    } else {
      await cacheStorage.clearBootstrap();
    }
  }, []);

  const hydrateWithToken = useCallback(
    async (authToken: string, cachedBootstrap?: BootstrapPayload | null) => {
      setSyncStatus("syncing");
      try {
        const fresh = await api.getBootstrap(authToken);
        await persistBootstrap(fresh);
        setStatus("authenticated");
        setSyncStatus("fresh");
        setError(null);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Не удалось синхронизировать данные";
        if (cachedBootstrap) {
          setStatus("authenticated");
          setSyncStatus("stale");
          setError(message);
          return;
        }

        await cacheStorage.clearToken();
        setToken(null);
        setStatus("unauthenticated");
        setSyncStatus("error");
        setError(message);
      }
    },
    [persistBootstrap],
  );

  const initialize = useCallback(async () => {
    const [cachedToken, cachedBootstrap] = await Promise.all([
      cacheStorage.getToken(),
      cacheStorage.getBootstrap(),
    ]);

    if (cachedBootstrap) {
      setData(normalizeBootstrap(cachedBootstrap));
    }

    if (!cachedToken) {
      setStatus("unauthenticated");
      setSyncStatus("idle");
      return;
    }

    setToken(cachedToken);
    setStatus("authenticated");
    await hydrateWithToken(cachedToken, cachedBootstrap);
  }, [hydrateWithToken]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus("unauthenticated");
      return;
    }
    await hydrateWithToken(token, data);
  }, [data, hydrateWithToken, token]);

  const login = useCallback(
    async (email: string, password: string) => {
      setStatus("loading");
      setError(null);
      const response = await api.login(email, password);
      await cacheStorage.setToken(response.token);
      setToken(response.token);
      setStatus("authenticated");
      await hydrateWithToken(response.token, data);
    },
    [data, hydrateWithToken],
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await api.logout(token);
      } catch {
        // Local logout should still succeed even if the API call fails.
      }
    }

    setToken(null);
    setStatus("unauthenticated");
    setSyncStatus("idle");
    setError(null);
    await cacheStorage.clearToken();
    await persistBootstrap(null);
  }, [persistBootstrap, token]);

  const requireToken = useCallback(() => {
    if (!token) {
      throw new Error("Сессия отсутствует");
    }
    return token;
  }, [token]);

  const markStoryRead = useCallback(
    async (storyId: string) => {
      const authToken = requireToken();
      if (data) {
        const nextBootstrap = touchBootstrap({
          ...data,
          stories: data.stories.map((story) => (story.id === storyId ? { ...story, read: true } : story)),
        });
        await persistBootstrap(nextBootstrap);
      }

      try {
        await api.markStoryRead(authToken, storyId);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось отметить сторис");
        await refresh();
      }
    },
    [data, persistBootstrap, refresh, requireToken],
  );

  const markUpdatesRead = useCallback(
    async (updateIds: string[] = []) => {
      const authToken = requireToken();
      if (data) {
        const idsToMark = updateIds.length > 0 ? new Set(updateIds) : new Set(data.orgUpdates.map((u) => u.id));
        const nextBootstrap = touchBootstrap({
          ...data,
          orgUpdates: data.orgUpdates.map((update) =>
            idsToMark.has(update.id) ? { ...update, isRead: true } : update,
          ),
        });
        await persistBootstrap(nextBootstrap);
      }

      try {
        await api.markUpdatesRead(authToken, updateIds);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось обновить уведомления");
        await refresh();
      }
    },
    [data, persistBootstrap, refresh, requireToken],
  );

  const saveProjectPriorities = useCallback(
    async (projectIds: string[]) => {
      const authToken = requireToken();
      if (data) {
        await persistBootstrap(touchBootstrap({ ...data, projectPriorities: projectIds }));
      }

      try {
        await api.saveProjectPriorities(authToken, projectIds);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить приоритеты");
        await refresh();
      }
    },
    [data, persistBootstrap, refresh, requireToken],
  );

  const updateProfilePreferences = useCallback(
    async (payload: ProfilePreferencesInput) => {
      const authToken = requireToken();
      if (data) {
        const nextVisibility = payload.visibilityMode ?? data.currentUser.visibility;
        const nextNotifications = payload.notificationsOn ?? data.currentUser.notificationsOn;
        const nextBootstrap = touchBootstrap({
          ...data,
          currentUser: {
            ...data.currentUser,
            visibility: nextVisibility,
            notificationsOn: nextNotifications,
          },
          people: data.people.map((person) =>
            person.id === data.currentUser.id ? { ...person, visibility: nextVisibility } : person,
          ),
        });
        await persistBootstrap(nextBootstrap);
      }

      try {
        await api.updateProfilePreferences(authToken, payload);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить настройки профиля");
        await refresh();
      }
    },
    [data, persistBootstrap, refresh, requireToken],
  );

  const checkInEvent = useCallback(
    async (eventId: string) => {
      const authToken = requireToken();
      if (data) {
        const nextEvents: Event[] = data.events.map((event) =>
          event.id === eventId ? { ...event, attendance: "confirmed" as const } : event,
        );
        await persistBootstrap(touchBootstrap({ ...data, events: nextEvents }));
      }

      try {
        await api.checkInEvent(authToken, eventId);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось подтвердить участие");
        await refresh();
      }
    },
    [data, persistBootstrap, refresh, requireToken],
  );

  const createAdminEntity = useCallback(
    async (resource: AdminResourcePath, payload: unknown): Promise<string> => {
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
    [refresh, requireToken],
  );

  const updateAdminEntity = useCallback(
    async (resource: AdminResourcePath, entityId: string, payload: unknown) => {
      const authToken = requireToken();
      try {
        await api.updateAdminEntity(authToken, resource, entityId, payload);
        await refresh();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Не удалось обновить запись");
        throw nextError;
      }
    },
    [refresh, requireToken],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      status,
      syncStatus,
      data,
      error,
      login,
      logout,
      refresh,
      markStoryRead,
      markUpdatesRead,
      saveProjectPriorities,
      updateProfilePreferences,
      checkInEvent,
      createAdminEntity,
      updateAdminEntity,
    }),
    [
      checkInEvent,
      createAdminEntity,
      data,
      error,
      login,
      logout,
      markStoryRead,
      markUpdatesRead,
      refresh,
      saveProjectPriorities,
      status,
      syncStatus,
      updateAdminEntity,
      updateProfilePreferences,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}
