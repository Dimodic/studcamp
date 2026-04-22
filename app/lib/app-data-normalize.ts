/**
 * Чистые хелперы нормализации bootstrap-пейлоада.
 *
 * Вынесены отдельно от provider-а, чтобы провайдер сосредоточился на
 * state-потоке и не перемешивался с capability-дефолтами и форматами.
 */
import type { BootstrapPayload } from "./domain";

export const DEFAULT_CAPABILITIES = {
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
} as const;

/**
 * Применяет дефолтные capability-флаги + сглаживает пробелы, которые могут
 * прийти от старых кешей (до добавления `projectTeams`, `adminUsers` и т.п.).
 */
export function normalizeBootstrap(bootstrap: BootstrapPayload): BootstrapPayload {
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
    projectTeams: bootstrap.projectTeams ?? [],
  };
}

/** Обновляет `lastSyncedAt` и проходит через normalizeBootstrap. */
export function touchBootstrap(bootstrap: BootstrapPayload): BootstrapPayload {
  return normalizeBootstrap({
    ...bootstrap,
    lastSyncedAt: new Date().toISOString(),
  });
}
