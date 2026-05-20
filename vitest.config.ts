import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/app/actions/**/*.ts"],
      exclude: [
        "src/generated/**",
        "src/**/__tests__/**",
        "src/**/*.{test,spec}.{ts,tsx}",
      ],
    },
  },
});
