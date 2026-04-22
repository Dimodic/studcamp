/**
 * Unit-тесты для api-клиента. Проверяем парсинг ошибок backend-а —
 * сервер может вернуть detail как строку / массив (pydantic validation) /
 * объект, и api.ts должен форматировать их в одну понятную строку.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";

describe("api error formatting", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws with the detail string when backend returns string detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Неверный email или пароль" }), {
        status: 401,
      }),
    );
    await expect(api.login("x@y", "bad")).rejects.toThrow("Неверный email или пароль");
  });

  it("joins validation errors when backend returns array detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [
            { loc: ["body", "email"], msg: "field required", type: "missing" },
            { loc: ["body", "password"], msg: "field required", type: "missing" },
          ],
        }),
        { status: 422 },
      ),
    );
    await expect(api.login("", "")).rejects.toThrow(
      /email: field required; password: field required/,
    );
  });

  it("falls back to default message when body is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    await expect(api.login("x@y", "bad")).rejects.toThrow("Не удалось выполнить запрос");
  });
});
