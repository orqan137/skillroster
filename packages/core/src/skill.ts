import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import matter from "gray-matter";
import { assertSlug } from "./ids.js";

export interface ParsedSkill {
  name: string;
  description: string;
  license?: string;
  compatibility: string[];
}

const FORBIDDEN_SECRET_FILE = /^(?:\.env(?:\..+)?|\.npmrc|\.pypirc|id_rsa|id_ed25519|credentials?(?:\..+)?|secrets?(?:\..+)?|service-account(?:\..+)?)$|\.(?:pem|key|p12|pfx)$/i;

function ignoredPackagePath(path: string): boolean {
  return path.split(/[\\/]/).some((segment) => segment === ".git" || segment === "node_modules");
}

export async function validateSkillPackage(directory: string): Promise<void> {
  let files = 0;
  let totalBytes = 0;
  async function inspect(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const packagePath = relative(directory, path);
      if (ignoredPackagePath(packagePath)) continue;
      if (entry.isSymbolicLink()) throw new Error(`스킬 패키지에는 심볼릭 링크를 포함할 수 없습니다: ${packagePath}`);
      if (entry.isDirectory()) {
        await inspect(path);
        continue;
      }
      const info = await lstat(path);
      if (!info.isFile()) throw new Error(`지원하지 않는 스킬 패키지 파일입니다: ${packagePath}`);
      if (FORBIDDEN_SECRET_FILE.test(entry.name)) throw new Error(`인증정보로 오인될 수 있는 파일은 공유할 수 없습니다: ${packagePath}`);
      files += 1;
      totalBytes += info.size;
      if (info.size > 2_000_000) throw new Error(`스킬 패키지 파일은 2MB를 넘을 수 없습니다: ${packagePath}`);
      if (files > 500 || totalBytes > 20_000_000) throw new Error("스킬 패키지는 파일 500개, 전체 20MB 이하여야 합니다.");
    }
  }
  await inspect(directory);
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
