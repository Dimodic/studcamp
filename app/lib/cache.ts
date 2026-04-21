import type { BootstrapPayload } from "./domain";

const TOKEN_KEY = "studcamp.authToken";
const BOOTSTRAP_KEY = "studcamp.bootstrapCache";

type MaybePromise<T> = T | Promise<T>;

interface StudcampElectronBridge {
  getItem(key: string): MaybePromise<string | null>;
  setItem(key: string, value: string): MaybePromise<void>;
  removeItem(key: string): MaybePromise<void>;
}

declare global {
  interface Window {
    studcampElectron?: StudcampElectronBridge;
  }
}

function getBridge(): StudcampElectronBridge | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.studcampElectron;
}

function isFiniteDateString(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime());
}

function isBootstrapCompatible(value: unknown): value is BootstrapPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const bootstrap = value as Partial<BootstrapPayload>;
  if (!Array.isArray(bootstrap.events) || !Array.isArray(bootstrap.resources)) {
    return false;
  }

  return bootstrap.events.every((event) => isFiniteDateString(event?.date));
}

async function getItem(key: string): Promise<string | null> {
  const bridge = getBridge();
  if (bridge) {
    return bridge.getItem(key);
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  const bridge = getBridge();
  if (bridge) {
    await bridge.setItem(key, value);
    return;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, value);
  }
}

async function removeItem(key: string): Promise<void> {
  const bridge = getBridge();
  if (bridge) {
    await bridge.removeItem(key);
    return;
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(key);
  }
}

export const cacheStorage = {
  async getToken(): Promise<string | null> {
    return getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await setItem(TOKEN_KEY, token);
  },
  async clearToken(): Promise<void> {
    await removeItem(TOKEN_KEY);
  },
  async getBootstrap(): Promise<BootstrapPayload | null> {
    const raw = await getItem(BOOTSTRAP_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isBootstrapCompatible(parsed)) {
        return parsed;
      }

      await removeItem(BOOTSTRAP_KEY);
      return null;
    } catch {
      await removeItem(BOOTSTRAP_KEY);
      return null;
    }
  },
  async setBootstrap(bootstrap: BootstrapPayload): Promise<void> {
    await setItem(BOOTSTRAP_KEY, JSON.stringify(bootstrap));
  },
  async clearBootstrap(): Promise<void> {
    await removeItem(BOOTSTRAP_KEY);
  },
};
