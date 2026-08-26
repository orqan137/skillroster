import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ProjectDocument } from "@skillspace/schemas";
import { parse, stringify } from "yaml";

export function localProjectConfigPath(projectRoot: string): string {
  return join(projectRoot, ".skillspace", "project.yaml");
}

export async function writeLocalProjectConfig(
  projectRoot: string,
  project: ProjectDocument,
): Promise<void> {
  const path = localProjectConfigPath(projectRoot);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(project, { lineWidth: 100 }), "utf8");
}

export async function readLocalProjectConfig(projectRoot: string): Promise<ProjectDocument> {
  const path = localProjectConfigPath(projectRoot);
  return parse(await readFile(path, "utf8")) as ProjectDocument;
}
