import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "./api";
import { cacheStorage } from "./cache";
import { type AdminActions, useAdminActions } from "./app-data-admin";
import { normalizeBootstrap, touchBootstrap } from "./app-data-normalize";
import type { BootstrapPayload, Event, VisibilityMode } from "./domain";
import { getTelegramInitData, signalTelegramReady } from "./telegram";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
type SyncStatus = "idle" | "syncing" | "fresh" | "stale" | "error";

interface ProfilePreferencesInput {
  visibilityMode?: VisibilityMode;
  notificationsOn?: boolean;
}

interface AuthAndSyncValue {
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
}

export type AppDataContextValue = AuthAndSyncValue & AdminActions;

const AppDataContext = createContext<AppDataContextValue | null>(null);

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
        const message =
          nextError instanceof Error ? nextError.message : "Не удалось синхронизировать данные";
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

    if (cachedToken) {
      setToken(cachedToken);
      setStatus("authenticated");
      await hydrateWithToken(cachedToken, cachedBootstrap);
      return;
    }

    // Если приложение открыто внутри Telegram — пробуем автоматический вход
    // через WebApp.initData. initData подписана ботом и проверяется на бэке,
    // там же проверяется членство пользователя в приватной группе кемпа.
    const initData = getTelegramInitData();
    if (initData) {
      signalTelegramReady();
      try {
        const response = await api.telegramLogin(initData);
        await cacheStorage.setToken(response.token);
        setToken(response.token);
        setStatus("authenticated");
        await hydrateWithToken(response.token, cachedBootstrap);
        return;
      } catch (nextError) {
        setStatus("unauthenticated");
        setSyncStatus("error");
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Не удалось авторизоваться через Telegram",
        );
        return;
      }
    }

    setStatus("unauthenticated");
    setSyncStatus("idle");
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
          stories: data.stories.map((story) =>
            story.id === storyId ? { ...story, read: true } : story,
          ),
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
        const idsToMark =
          updateIds.length > 0 ? new Set(updateIds) : new Set(data.orgUpdates.map((u) => u.id));
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
        setError(
          nextError instanceof Error ? nextError.message : "Не удалось обновить уведомления",
        );
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
        setError(
          nextError instanceof Error ? nextError.message : "Не удалось сохранить приоритеты",
        );
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
        setError(
          nextError instanceof Error ? nextError.message : "Не удалось сохранить настройки профиля",
        );
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

  const adminActions = useAdminActions({ requireToken, refresh, setError });

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
      ...adminActions,
    }),
    [
      adminActions,
      checkInEvent,
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
      updateProfilePreferences,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used inside <AppDataProvider>");
  }
  return ctx;
}
