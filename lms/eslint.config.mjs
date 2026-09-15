import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Secrets / env hygiene
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      // Conventional `_`-prefixed params/vars are intentionally unused (e.g. stub signatures).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "data/",
      "next-env.d.ts",
      "drizzle/meta/",
      "coverage/",
    ],
  },
];

export default eslintConfig;
