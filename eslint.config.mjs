import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Framework-agnostic boundary: modules/<id>/server/** is pure business logic.
  // It MUST NOT import React, react-dom, or any sibling/other-module ui/hooks
  // layer. (next/server is allowed — *.service.next.ts files legitimately use it.)
  {
    files: ["modules/*/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "modules/*/server is framework-agnostic — no React in server/.", allowTypeImports: true },
            { name: "react-dom", message: "modules/*/server is framework-agnostic — no react-dom in server/.", allowTypeImports: true },
          ],
          patterns: [
            {
              group: [
                "react/*",
                "react-dom/*",
                "@kuraykaraaslan/*/ui",
                "@kuraykaraaslan/*/ui/*",
                "@kuraykaraaslan/*/hooks",
                "@kuraykaraaslan/*/hooks/*",
                "**/ui/*",
                "**/hooks/*",
              ],
              message:
                "modules/*/server may not import ui/hooks layers (use @kuraykaraaslan/<id>/server only).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
