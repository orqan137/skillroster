import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoRegistry } from "./demo.js";

describe("createDemoRegistry", () => {
  it("creates a complete, internally valid demo without Git credentials", async () => {
    const parent = await mkdtemp(join(tmpdir(), "skillroster-demo-test-"));
    const { repository, directory, member, sourcesConfig } = await createDemoRegistry(parent);
    const snapshot = await repository.snapshot();
    const sourceSettings = await readFile(sourcesConfig, "utf8");

    expect(directory.startsWith(parent)).toBe(true);
    expect(member).toBe("minjun");
    expect(sourceSettings).toContain("completed: true");
    expect(sourceSettings).toMatch(/examples.*skills/);
    expect(snapshot.members).toHaveLength(3);
    expect(snapshot.skills).toHaveLength(3);
    expect(snapshot.projects).toHaveLength(2);
    expect(snapshot.skillsets).toHaveLength(2);
    expect(snapshot.skillsets.every((skillset) => skillset.spec.skills.length === 2)).toBe(true);
    expect(snapshot.reviews).toHaveLength(4);
    expect(snapshot.evidence).toHaveLength(2);
    expect(snapshot.evidence.every((evidence) =>
      evidence.spec.privacy.promptStored === false && evidence.spec.privacy.sourceStored === false,
    )).toBe(true);
    await expect(repository.ensureClean()).resolves.toBeUndefined();
  }, 45_000);
});
