import { defineConfig } from "tsup";

export default defineConfig([
  // Core (framework-agnostic)
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
  },
  // React
  {
    entry: ["src/react/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    outDir: "dist/react",
    external: ["react"],
    banner: { js: '"use client";' },
  },
  // Vue
  {
    entry: ["src/vue/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    outDir: "dist/vue",
    external: ["vue"],
  },
]);
