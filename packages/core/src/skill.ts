import { lstat, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import matter from "gray-matter";
import { assertSlug } from "./ids.js";

export interface ParsedSkill {
  name: string;
  description: string;
  license?: string;
  compatibility: string[];
}

export async function validateSkillPackage(directory: string): Promise<void> {
  const path = join(directory, "SKILL.md");
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw new Error("SKILL.md는 심볼릭 링크로 공유할 수 없습니다.");
  if (!info.isFile()) throw new Error("SKILL.md 파일을 찾을 수 없습니다.");
  if (info.size > 2_000_000) throw new Error("SKILL.md는 2MB를 넘을 수 없습니다.");
}

export async function parseSkillDirectory(directory: string): Promise<ParsedSkill> {
  const path = join(directory, "SKILL.md");
  const source = await readFile(path, "utf8").catch((error: unknown) => {
    throw new Error(`Unable to read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  });
  const parsed = matter(source);
  const name = String(parsed.data.name ?? basename(directory));
  const description = String(parsed.data.description ?? "").trim();
  assertSlug(name, "skill name");
  if (!description) {
    throw new Error("SKILL.md frontmatter must include a non-empty description");
  }

  const compatibilityValue = parsed.data.compatibility;
  const compatibility = Array.isArray(compatibilityValue)
    ? compatibilityValue.map(String)
    : compatibilityValue
      ? [String(compatibilityValue)]
      : ["opencode"];

  return {
    name,
    description,
    ...(parsed.data.license ? { license: String(parsed.data.license) } : {}),
    compatibility,
  };
}
