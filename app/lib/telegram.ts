/**
 * Хелперы для интеграции с Telegram WebApp.
 *
 * SDK подключается в index.html через <script src="telegram-web-app.js">.
 * Если приложение открыто не из Telegram — window.Telegram.WebApp отсутствует
 * или его initData пуст, и мы просто показываем обычный логин.
 */

interface TelegramWebApp {
  initData: string;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
}

interface TelegramGlobal {
  WebApp?: TelegramWebApp;
}

function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as typeof window & { Telegram?: TelegramGlobal }).Telegram;
  return tg?.WebApp ?? null;
}

/** Сырая строка initData — передаётся на backend для верификации. */
export function getTelegramInitData(): string | null {
  const webApp = getWebApp();
  if (!webApp) return null;
  const data = webApp.initData;
  return typeof data === "string" && data.length > 0 ? data : null;
}

/** true, если приложение открыто внутри Telegram. */
export function isTelegramWebApp(): boolean {
  return getTelegramInitData() !== null;
}

/**
 * Сообщить Telegram, что WebApp готов, и развернуть на всю высоту.
 * Безопасно вызывается в любом контексте — no-op вне Telegram.
 */
export function signalTelegramReady(): void {
  const webApp = getWebApp();
  webApp?.ready?.();
  webApp?.expand?.();
}
