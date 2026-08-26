import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoRegistry } from "./demo.js";

describe("createDemoRegistry", () => {
  it("creates a complete, internally valid demo without Git credentials", async () => {
    const parent = await mkdtemp(join(tmpdir(), "skillroster-demo-test-"));
    const { repository, directory, member } = await createDemoRegistry(parent);
    const snapshot = await repository.snapshot();

    expect(directory.startsWith(parent)).toBe(true);
    expect(member).toBe("minjun");
    expect(snapshot.members).toHaveLength(3);
    expect(snapshot.skills).toHaveLength(3);
    expect(snapshot.projects).toHaveLength(1);
    expect(snapshot.skillsets[0]?.spec.skills).toHaveLength(2);
    expect(snapshot.reviews).toHaveLength(3);
    expect(snapshot.evidence).toHaveLength(1);
    expect(snapshot.evidence[0]?.spec.privacy).toEqual({
      promptStored: false,
      sourceStored: false,
    });
    await expect(repository.ensureClean()).resolves.toBeUndefined();
  }, 20_000);
});
