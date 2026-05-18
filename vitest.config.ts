import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config. Mirrors the @/* path alias from tsconfig so test files can
 * import application code the same way the rest of the codebase does.
 *
 * Only scoring tests for now (pure functions, no DB). When we add tests that
 * touch I/O (Supabase, network), we'll split into a separate project or use
 * dotenv config there explicitly.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
