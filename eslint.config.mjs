// ESLint flat config (ESLint 9+, см. https://eslint.org/docs/latest/use/configure/configuration-files).
// Стек: React 18 + TypeScript strict + Vite. Хуки React проверяются плагином.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "android/**",
      "backend/**",
      "scripts/**",
      "screenshots/**",
      "public/**",
      ".omx/**",
      ".claude/**",
      "**/*.d.ts",
      "**/vite.config.ts.timestamp-*",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["app/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Новые opinion-правила react-hooks@7: в унаследованном коде их
      // массово ловить бессмысленно. Переводим в warn — чиним постепенно
      // в последующих партиях рефакторинга (gd-components, app-data split).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      // Пробелы в пустых пропсах/объектах не нужны.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      // `void 0` допустим для промисов.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Излишне шумит на catch-блоках и defaults-массивах.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false, properties: false } },
      ],
    },
  },
  {
    files: ["vite.config.ts", "eslint.config.mjs", "postcss.config.mjs"],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { project: null },
    },
    ...tseslint.configs.disableTypeChecked,
  },
);
