import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  platform: "node",
  target: "es2022",
  outDir: "dist",
  clean: true,
  dts: true,
  shims: true,
  noExternal: [/^@skillspace\//],
});
