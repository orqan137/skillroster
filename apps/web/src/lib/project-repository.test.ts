import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { projectConfigurationDocument, syncProjectRepository } from "./project-repository.js";

const execFileAsync = promisify(execFile);

describe("projectConfigurationDocument", () => {
  it("records project skills without embedding referenced files", () => {
    expect(projectConfigurationDocument({
      project: "payment-api",
      displayName: "결제 API",
      projectRepository: "https://github.com/example/payment-api",
      teamRegistry: "https://github.com/example/team-roster",
      skills: [{ skill: "hong/release-check", version: "1.0.0" }],
    }, new Date("2026-08-26T00:00:00.000Z"))).toEqual({
      apiVersion: "skillroster.dev/v1alpha1",
      kind: "ProjectConfiguration",
      metadata: { name: "payment-api" },
      spec: {
        displayName: "결제 API",
        projectRepository: "https://github.com/example/payment-api",
        teamRegistry: "https://github.com/example/team-roster",
        skills: [{ skill: "hong/release-check", version: "1.0.0" }],
        updatedAt: "2026-08-26T00:00:00.000Z",
        privacy: { referencedFilesUploaded: false },
      },
    });
  });

  it("initializes an empty project remote and pushes the configuration", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillroster-project-test-"));
    const remote = join(root, "project.git");
    await execFileAsync("git", ["init", "--bare", "--initial-branch=main", remote]);

    await expect(syncProjectRepository({
      project: "payment-api",
      displayName: "결제 API",
      projectRepository: remote,
      skills: [{ skill: "hong/release-check", version: "1.0.0" }],
      identity: { name: "Hong", email: "hong@example.com" },
    })).resolves.toMatchObject({ branch: "main", changed: true });

    const checkout = join(root, "checkout");
    await execFileAsync("git", ["clone", remote, checkout]);
    await expect(readFile(join(checkout, ".skillroster", "project.yaml"), "utf8")).resolves.toContain("referencedFilesUploaded: false");
  }, 15_000);
});
