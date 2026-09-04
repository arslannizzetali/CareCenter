import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@bakimevi/validation": new URL("../../packages/validation/src/index.ts", import.meta.url).pathname,
      "@bakimevi/shared-types": new URL("../../packages/shared-types/src/index.ts", import.meta.url).pathname
    }
  },
  test: {
    globals: true,
    environment: "node",
    include: ["../../tests/**/*.test.ts", "src/**/*.test.ts"],
    setupFiles: ["../../tests/setup.ts"]
  }
});
