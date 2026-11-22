import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(process.cwd()) },
  },
  test: {
    environment: "node",
    include: [
      "features/**/*.test.ts",
      "components/**/*.test.tsx",
      "lib/**/*.test.ts",
    ],
  },
});
