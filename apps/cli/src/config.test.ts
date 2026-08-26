import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readConfig, saveTeamConnection } from "./config.js";

describe("client config", () => {
  it("persists an active Git team connection", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillspace-cli-"));
    const configPath = join(root, "config.yaml");
    await saveTeamConnection(
      "backend",
      {
        remote: "git@example.com:backend/team-skills.git",
        directory: join(root, "registry"),
        member: "hong",
      },
      configPath,
    );
    const config = await readConfig(configPath);
    expect(config.activeTeam).toBe("backend");
    expect(config.teams.backend?.member).toBe("hong");
  });
});
