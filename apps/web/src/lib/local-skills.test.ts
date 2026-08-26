import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readLocalSourcesConfig, saveLocalSources } from "./local-config.js";
import { createLocalSkill, resolveConnectedLocalSkill, scanLocalSkills } from "./local-skills.js";

const originalSourcesConfig = process.env.SKILLSPACE_SOURCES_CONFIG;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  if (originalSourcesConfig === undefined) delete process.env.SKILLSPACE_SOURCES_CONFIG;
  else process.env.SKILLSPACE_SOURCES_CONFIG = originalSourcesConfig;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("local skill discovery", () => {
  it("finds nested SKILL.md metadata without reading unrelated project files", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillroster-local-scan-"));
    temporaryDirectories.push(root);
    const source = join(root, ".opencode", "skills");
    const skillDirectory = join(source, "release-check");
    await mkdir(skillDirectory, { recursive: true });
    await writeFile(join(skillDirectory, "SKILL.md"), "---\nname: release-check\ndescription: 배포 전 변경 사항을 검사합니다.\n---\n# Instructions\n", "utf8");
    await writeFile(join(skillDirectory, "secret.txt"), "must-not-be-parsed", "utf8");
    process.env.SKILLSPACE_SOURCES_CONFIG = join(root, "client", "sources.yaml");

    const scan = await scanLocalSkills([source]);
    const discovered = scan.skills.find((skill) => skill.sourcePath === source);
    expect(discovered).toMatchObject({
      name: "release-check",
      description: "배포 전 변경 사항을 검사합니다.",
      path: join(skillDirectory, "SKILL.md"),
    });
    expect(scan.sources.find((item) => item.path === source)).toMatchObject({ exists: true, skillCount: 1 });

    await saveLocalSources([source]);
    await expect(readLocalSourcesConfig()).resolves.toMatchObject({ completed: true, sources: [source] });
    const connectedScan = await scanLocalSkills();
    expect(connectedScan.sources.find((item) => item.path === source)?.connected).toBe(true);
  });

  it("ignores oversized skill documents", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillroster-large-scan-"));
    temporaryDirectories.push(root);
    const source = join(root, "skills");
    const skillDirectory = join(source, "too-large");
    await mkdir(skillDirectory, { recursive: true });
    await writeFile(join(skillDirectory, "SKILL.md"), "x".repeat(256_001), "utf8");
    process.env.SKILLSPACE_SOURCES_CONFIG = join(root, "sources.yaml");
    const scan = await scanLocalSkills([source]);
    expect(scan.skills.some((skill) => skill.sourcePath === source)).toBe(false);
  });

  it("creates a SKILL.md in a connected personal source and resolves it for sharing", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillroster-local-create-"));
    temporaryDirectories.push(root);
    const source = join(root, "skills");
    await mkdir(source, { recursive: true });
    process.env.SKILLSPACE_SOURCES_CONFIG = join(root, "sources.yaml");
    await saveLocalSources([source]);

    const directory = await createLocalSkill({
      sourcePath: source,
      name: "incident-guide",
      description: "장애 대응 순서를 안내합니다.",
      instructions: "관련 업무 문서를 확인하고 단계별 대응 기록을 남깁니다.",
    });
    const markdown = await import("node:fs/promises").then(({ readFile }) => readFile(join(directory, "SKILL.md"), "utf8"));
    expect(markdown).toContain("name: incident-guide");
    expect(markdown).toContain("장애 대응 순서");
    await expect(resolveConnectedLocalSkill(directory)).resolves.toMatchObject({ name: "incident-guide" });
  });
});
