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
      // Temporarily relaxed for testing - will clean up later
      "@typescript-eslint/no-explicit-any": "warn", // Changed from "off"
      "react/no-unescaped-entities": "off", // Keep off for markdown content
      "@typescript-eslint/no-unused-vars": "warn", // Temporarily back to warn
      "react-hooks/exhaustive-deps": "warn", // Temporarily back to warn
      "@next/next/no-img-element": "warn", // Temporarily back to warn
      // Add new rules for better code quality
      "no-console": "warn", // Reduce console.log usage
    },
  },
];

export default eslintConfig;
