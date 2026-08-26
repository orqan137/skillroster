import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  platform: "node",
  target: "es2022",
  outDir: "dist-server",
  clean: true,
  external: ["vite"],
  noExternal: [/^@skillspace\//],
});
