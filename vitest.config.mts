import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The real package throws outside a React Server Component graph; the
      // Next.js build still enforces the boundary. See tests/stubs/server-only.ts.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});
