export type ViewportMode = "auto" | "desktop" | "mobile";

const STORAGE_KEY = "studcamp.devViewport";
const EVENT_NAME = "studcamp:viewport-changed";

function isValidMode(value: unknown): value is ViewportMode {
  return value === "auto" || value === "desktop" || value === "mobile";
}

export function getViewportMode(): ViewportMode {
  if (typeof window === "undefined") {
    return "auto";
  }
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (isValidMode(value)) {
    return value;
  }
  return "auto";
}

export function setViewportMode(mode: ViewportMode): void {
  if (typeof window === "undefined") {
    return;
  }
  if (mode === "auto") {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeViewportMode(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
