import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Global ignores MUST come first
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    ".codex/**",
    ".aiox-core/**",
    ".cursor/**",
    ".antigravity/**",
    ".gemini/**",
    ".github/**",
    "temp-setup/**",
    "node_modules/**",
  ]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
