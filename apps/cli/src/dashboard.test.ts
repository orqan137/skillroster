import { describe, expect, it } from "vitest";
import { resolveWebDirectory } from "./dashboard.js";

describe("dashboard", () => {
  it("finds the workspace web client", async () => {
    await expect(resolveWebDirectory()).resolves.toMatch(/[\\/]apps[\\/]web$/);
  });
});
