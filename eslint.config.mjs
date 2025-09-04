import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Re-enable critical rules for better code quality
      "@typescript-eslint/no-explicit-any": "warn", // Changed from "off"
      "react/no-unescaped-entities": "off", // Keep off for markdown content
      "@typescript-eslint/no-unused-vars": "error", // Changed from "warn"
      "react-hooks/exhaustive-deps": "error", // Changed from "warn"
      "@next/next/no-img-element": "error", // Changed from "warn"
      // Add new rules for better code quality
      "no-console": "warn", // Reduce console.log usage
    },
  },
];

export default eslintConfig;
