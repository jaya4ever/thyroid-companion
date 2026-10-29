import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", ".vite", "out", "desktop-test-results"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react },
    rules: {
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: ["*.cjs", "*.mjs", "scripts/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["electron/**/*.ts"],
    extends: [js.configs.recommended],
    languageOptions: {
      parser: babelParser,
      globals: globals.node,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { plugins: ["@babel/plugin-syntax-typescript"] },
      },
    },
    // TypeScript checks names and unused declarations, including type-only names.
    rules: { "no-undef": "off", "no-unused-vars": "off" },
  },
]);
