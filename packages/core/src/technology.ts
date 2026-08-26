import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

export interface DetectedProject {
  tags: string[];
  verificationCommands: string[];
}

export async function detectProjectTechnology(directory: string): Promise<DetectedProject> {
  const tags = new Set<string>();
  const verificationCommands: string[] = [];

  if (await exists(join(directory, "package.json"))) {
    tags.add("javascript");
    const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (dependencies.next) tags.add("nextjs");
    if (dependencies.react) tags.add("react");
    if (dependencies.vue) tags.add("vue");
    if (dependencies.typescript) tags.add("typescript");
    if (packageJson.scripts?.test) verificationCommands.push("npm test");
  }

  if ((await exists(join(directory, "pom.xml"))) || (await exists(join(directory, "build.gradle")))) {
    tags.add("java");
    const buildFile = (await exists(join(directory, "pom.xml"))) ? "pom.xml" : "build.gradle";
    const contents = await readFile(join(directory, buildFile), "utf8");
    if (/spring-boot/i.test(contents)) tags.add("spring-boot");
    verificationCommands.push(buildFile === "pom.xml" ? "mvn test" : "./gradlew test");
  }

  if (await exists(join(directory, "go.mod"))) {
    tags.add("go");
    verificationCommands.push("go test ./...");
  }
  if (await exists(join(directory, "Cargo.toml"))) {
    tags.add("rust");
    verificationCommands.push("cargo test");
  }
  if (await exists(join(directory, "pyproject.toml"))) {
    tags.add("python");
    verificationCommands.push("pytest");
  }
  if (await exists(join(directory, "Dockerfile"))) tags.add("docker");

  return {
    tags: [...tags].sort(),
    verificationCommands,
  };
}
