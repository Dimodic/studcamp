/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/setup-tests.ts"],
    css: false,
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: ["app/**/*.{test,spec}.{ts,tsx}", "app/main.tsx", "app/vite-env.d.ts"],
    },
  },
});
