import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [{ ignores: [
  ".next/**",
  ".codex-worktrees/**",
  ".pnpm-store/**",
  "node_modules/**",
  "tmp/**",
  "artifacts/**",
  "output/**",
  "outputs/**",
  "bgr-current-site/**",
  "eff-careers-site/**",
  "miss-bgr-autumn-2026/**",
  "reach-action-hub/**",
  "rooted-in-soul-site/**",
  "shayna-vincent-site/**",
  "tracker-previews/**",
  "work/**",
  "next-env.d.ts",
] }, ...compat.extends("next/core-web-vitals", "next/typescript")];
export default config;
