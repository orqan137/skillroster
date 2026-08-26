import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  installSkillSpaceIntegration,
  writeInstalledSkillManifest,
} from "./index.js";

const execFileAsync = promisify(execFile);

describe("OpenCode integration", () => {
  it("installs a privacy-preserving plugin and preserves an existing Git hook", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillspace-plugin-"));
    await execFileAsync("git", ["init", "--initial-branch=main", root]);
    const hook = join(root, ".git", "hooks", "post-commit");
    await mkdir(join(root, ".git", "hooks"), { recursive: true });
    await writeFile(hook, "#!/bin/sh\necho existing\n", "utf8");

    const result = await installSkillSpaceIntegration(root);
    await installSkillSpaceIntegration(root);
    await writeInstalledSkillManifest(root, [
      { name: "review", skill: "kim/review", version: "1.0.0" },
    ]);

    const plugin = await readFile(result.pluginPath, "utf8");
    const hookSource = await readFile(hook, "utf8");
    const manifest = JSON.parse(
      await readFile(join(root, ".skillspace", "installed.json"), "utf8"),
    ) as { skills: Array<{ skill: string }> };
    expect(plugin).toContain('privacy: { promptStored: false, sourceStored: false }');
    expect(hookSource).toContain("echo existing");
    expect(hookSource.match(/>>> skillspace managed hook >>>/g)).toHaveLength(1);
    expect(hookSource).not.toMatch(/^\+/m);
    expect(manifest.skills[0]?.skill).toBe("kim/review");
  });
});
