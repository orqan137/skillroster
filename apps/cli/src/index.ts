#!/usr/bin/env node
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import {
  addProjectSkill,
  createProject,
  detectProjectTechnology,
  installProjectSkills,
  publishSkill,
  rankSkills,
  recommendSkills,
  slugify,
  writeReview,
} from "@skillspace/core";
import { GitTeamRepository } from "@skillspace/git";
import {
  installSkillSpaceIntegration,
  writeInstalledSkillManifest,
} from "@skillspace/opencode-plugin";
import type { Visibility } from "@skillspace/schemas";
import { Command } from "commander";
import { resolveTeamConnection, saveTeamConnection } from "./config.js";
import { launchDashboard } from "./dashboard.js";
import { createDemoRegistry } from "./demo.js";
import { flushEvidence } from "./evidence.js";
import { discoverGitIdentity } from "./identity.js";
import { readLocalProjectConfig, writeLocalProjectConfig } from "./project-config.js";

const program = new Command();
program
  .name("skillroster")
  .description("Git-native team collaboration for AI agent skills")
  .version("0.1.0", "-V, --cli-version", "print the SkillRoster CLI version");

function defaultTeamDirectory(name: string): string {
  return join(homedir(), ".skillspace", "teams", name);
}

function parseList(value?: string): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

async function activeRepository(team?: string): Promise<{
  repository: GitTeamRepository;
  member: string;
}> {
  const { connection } = await resolveTeamConnection(team);
  const repository = await GitTeamRepository.open(connection.directory);
  return { repository, member: connection.member };
}

const team = program.command("team").description("Create and connect team registries");

team
  .command("init")
  .description("Initialize an empty Git repository as a SkillRoster team")
  .requiredOption("--name <slug>", "team slug")
  .option("--display-name <name>", "team display name")
  .requiredOption("--owner <slug>", "owner handle")
  .option("--owner-name <name>", "owner display name")
  .option("--email <email>", "owner email")
  .requiredOption("--remote <url>", "empty Git remote URL or local bare repository")
  .option("--directory <path>", "local registry clone directory")
  .action(async (options) => {
    const identity = await discoverGitIdentity({
      name: options.ownerName,
      email: options.email,
    });
    const directory = resolve(options.directory ?? defaultTeamDirectory(options.name));
    const repository = await GitTeamRepository.initialize({
      directory,
      remote: options.remote,
      name: options.name,
      displayName: options.displayName ?? options.name,
      owner: options.owner,
      ownerDisplayName: options.ownerName ?? identity.name,
      ownerEmail: options.email ?? identity.email,
      identity,
    });
    await saveTeamConnection(options.name, {
      remote: options.remote,
      directory,
      member: options.owner,
    });
    console.log(`Initialized ${options.name} at ${directory}`);
    console.log(`Revision: ${await repository.revision()}`);
  });

team
  .command("join")
  .description("Connect to an initialized SkillRoster Git repository")
  .argument("<remote>", "Git remote URL or local bare repository")
  .requiredOption("--member <slug>", "member handle")
  .option("--display-name <name>", "member display name")
  .option("--email <email>", "member email")
  .option("--directory <path>", "local registry clone directory")
  .action(async (remote, options) => {
    const identity = await discoverGitIdentity({
      name: options.displayName,
      email: options.email,
    });
    const remoteName = basename(String(remote).replace(/\.git$/, ""));
    const directory = resolve(options.directory ?? defaultTeamDirectory(slugify(remoteName)));
    const repository = await GitTeamRepository.join({
      remote,
      directory,
      member: options.member,
      displayName: options.displayName ?? identity.name,
      email: options.email ?? identity.email,
      identity,
    });
    const snapshot = await repository.snapshot();
    await saveTeamConnection(snapshot.team.metadata.name, {
      remote,
      directory,
      member: options.member,
    });
    console.log(`Joined ${snapshot.team.spec.displayName} as ${options.member}`);
  });

program
  .command("publish")
  .description("Publish a local SKILL.md directory to the active team")
  .argument("<directory>", "skill directory")
  .requiredOption("--version <version>", "semantic version")
  .option("--tags <tags>", "comma-separated tags")
  .option("--visibility <visibility>", "private, team, verified, or deprecated", "team")
  .option("--team <slug>", "team override")
  .action(async (directory, options) => {
    const { repository, member } = await activeRepository(options.team);
    const document = await repository.transaction(
      `feat(skill): publish ${member} skill ${options.version}`,
      () =>
        publishSkill(repository.directory, {
          sourceDirectory: resolve(directory),
          owner: member,
          version: options.version,
          tags: parseList(options.tags),
          visibility: options.visibility as Visibility,
        }),
    );
    console.log(`Published ${member}/${document.metadata.name}@${document.spec.version}`);
  });

program
  .command("review")
  .description("Review a teammate's skill version")
  .argument("<skill>", "owner/name")
  .requiredOption("--version <version>", "skill version")
  .requiredOption("--score <score>", "integer score from 1 to 5", Number)
  .requiredOption("--comment <comment>", "review comment")
  .option("--project <slug>", "project context")
  .option("--team <slug>", "team override")
  .action(async (skill, options) => {
    const { repository, member } = await activeRepository(options.team);
    await repository.transaction(`docs(review): ${member} reviewed ${skill}@${options.version}`, () =>
      writeReview(repository.directory, {
        skill,
        version: options.version,
        reviewer: member,
        score: options.score,
        comment: options.comment,
        ...(options.project ? { project: options.project } : {}),
      }),
    );
    console.log(`Reviewed ${skill}@${options.version}: ${options.score}/5`);
  });

const project = program.command("project").description("Manage project skill loadouts");

project
  .command("init")
  .description("Register the current code project and detect its technology tags")
  .option("--name <slug>", "project slug")
  .option("--display-name <name>", "project display name")
  .option("--directory <path>", "code project directory", process.cwd())
  .option("--tags <tags>", "extra comma-separated tags")
  .option("--verify <commands>", "comma-separated verification commands")
  .option("--team <slug>", "team override")
  .action(async (options) => {
    const projectRoot = resolve(options.directory);
    const projectName = options.name ?? slugify(basename(projectRoot));
    const detected = await detectProjectTechnology(projectRoot);
    const { repository, member } = await activeRepository(options.team);
    const document = await repository.transaction(`feat(project): register ${projectName}`, () =>
      createProject(repository.directory, {
        name: projectName,
        displayName: options.displayName ?? projectName,
        tags: [...detected.tags, ...parseList(options.tags)],
        verificationCommands: parseList(options.verify).length
          ? parseList(options.verify)
          : detected.verificationCommands,
        createdBy: member,
      }),
    );
    await writeLocalProjectConfig(projectRoot, document);
    const integration = await installSkillSpaceIntegration(projectRoot);
    const snapshot = await repository.snapshot();
    const ranked = rankSkills(
      snapshot.skills,
      snapshot.reviews,
      snapshot.evidence,
      snapshot.skillsets,
    );
    const recommendations = recommendSkills(document, ranked).slice(0, 10);
    console.log(`Registered project ${projectName} with tags: ${document.spec.tags.join(", ") || "none"}`);
    if (recommendations.length) {
      console.log("Recommended team skills:");
      for (const item of recommendations) {
        console.log(
          `  ${item.skill}@${item.version} score=${item.recommendationScore} tags=${item.matchingTags.join(",")}`,
        );
      }
    }
    console.log(`OpenCode plugin: ${integration.pluginPath}`);
    console.log(
      integration.hookPath
        ? `Git evidence hook: ${integration.hookPath}`
        : "Git evidence hook skipped: the project is not a Git worktree",
    );
  });

project
  .command("add")
  .description("Add a team skill to a project's Skill Set")
  .argument("<skill>", "owner/name")
  .option("--version <version>", "version; defaults to current published version")
  .option("--project <slug>", "project slug; defaults to local project config")
  .option("--directory <path>", "code project directory", process.cwd())
  .option("--team <slug>", "team override")
  .action(async (skill, options) => {
    const { repository } = await activeRepository(options.team);
    const snapshot = await repository.snapshot();
    const target = snapshot.skills.find((item) => item.id === skill);
    if (!target) throw new Error(`Unknown team skill: ${skill}`);
    const localProject = options.project
      ? undefined
      : await readLocalProjectConfig(resolve(options.directory));
    const projectName = options.project ?? localProject?.metadata.name;
    if (!projectName) throw new Error("Project is required");
    const version = options.version ?? target.document.spec.version;
    await repository.transaction(`feat(project): add ${skill}@${version} to ${projectName}`, () =>
      addProjectSkill(repository.directory, projectName, skill, version),
    );
    console.log(`Added ${skill}@${version} to ${projectName}`);
  });

program
  .command("sync")
  .description("Install the current project's Skill Set into one or more AI coding agents")
  .option("--directory <path>", "code project directory", process.cwd())
  .option("--team <slug>", "team override")
  .option("-t, --target <target...>", "install target: opencode, codex, or claude", ["opencode"])
  .action(async (options) => {
    const projectRoot = resolve(options.directory);
    const localProject = await readLocalProjectConfig(projectRoot);
    const { repository } = await activeRepository(options.team);
    await repository.sync();
    const installations = await installProjectSkills(
      repository.directory,
      localProject.metadata.name,
      projectRoot,
      options.target,
    );
    const openCode = installations.find((item) => item.target === "opencode");
    if (openCode) {
      await writeInstalledSkillManifest(projectRoot, openCode.skills);
      await installSkillSpaceIntegration(projectRoot);
    }
    for (const installation of installations) {
      console.log(
        `Installed ${installation.skills.length} skill(s) for ${installation.label} into ${installation.directory}`,
      );
      for (const skill of installation.skills) console.log(`  ${skill.skill}@${skill.version}`);
    }
  });

program
  .command("setup")
  .description("Install the OpenCode evidence plugin and Git post-commit hook in a project")
  .option("--directory <path>", "code project directory", process.cwd())
  .action(async (options) => {
    const result = await installSkillSpaceIntegration(resolve(options.directory));
    console.log(`OpenCode plugin: ${result.pluginPath}`);
    console.log(
      result.hookPath
        ? `Git evidence hook: ${result.hookPath}`
        : "Git evidence hook skipped: the project is not a Git worktree",
    );
  });

const evidence = program.command("evidence").description("Manage privacy-preserving skill evidence");

evidence
  .command("flush")
  .description("Verify and publish queued OpenCode skill-use events")
  .requiredOption("--commit <sha>", "accepted Git commit SHA")
  .option("--directory <path>", "code project directory", process.cwd())
  .option("--team <slug>", "team override")
  .action(async (options) => {
    const { repository, member } = await activeRepository(options.team);
    const result = await flushEvidence({
      projectRoot: resolve(options.directory),
      commit: options.commit,
      repository,
      member,
    });
    if (!result.processed) {
      console.log("No queued skill-use evidence");
      return;
    }
    console.log(`Published ${result.processed} evidence event(s): ${result.status}`);
  });

program
  .command("demo")
  .description("Launch a credential-free sample roster for evaluation")
  .option("--directory <path>", "parent directory for the temporary registry")
  .option("--hostname <host>", "listen hostname", "127.0.0.1")
  .option("--port <port>", "listen port", Number, 3211)
  .option("--no-open", "do not open the browser")
  .option("--dev", "run the dashboard in development mode")
  .option("--web-directory <path>", "web client directory override")
  .action(async (options) => {
    const demo = await createDemoRegistry(options.directory ? resolve(options.directory) : undefined);
    const snapshot = await demo.repository.snapshot();
    console.log(`Demo registry: ${demo.directory}`);
    console.log(`Sample data: ${snapshot.members.length} members · ${snapshot.skills.length} skills · ${snapshot.projects.length} projects · ${snapshot.reviews.length} reviews · ${snapshot.evidence.filter((item) => item.spec.status === "verified").length} verified runs`);
    await launchDashboard({
      registry: demo.directory,
      member: demo.member,
      sourcesConfig: demo.sourcesConfig,
      hostname: options.hostname,
      port: options.port,
      open: options.open,
      development: options.dev,
      webDirectory: options.webDirectory,
    });
  });

program
  .command("dashboard")
  .description("Launch the local visual team dashboard")
  .option("--team <slug>", "team override")
  .option("--hostname <host>", "listen hostname", "127.0.0.1")
  .option("--port <port>", "listen port", Number, 3210)
  .option("--no-open", "do not open the browser")
  .option("--dev", "run the dashboard in development mode")
  .option("--web-directory <path>", "web client directory override")
  .action(async (options) => {
    const { repository, member } = await activeRepository(options.team);
    await repository.sync();
    await launchDashboard({
      registry: repository.directory,
      member,
      hostname: options.hostname,
      port: options.port,
      open: options.open,
      development: options.dev,
      webDirectory: options.webDirectory,
    });
  });

program
  .command("rank")
  .description("Print the active team's skill ranking")
  .option("--team <slug>", "team override")
  .action(async (options) => {
    const { repository } = await activeRepository(options.team);
    await repository.sync();
    const snapshot = await repository.snapshot();
    const ranked = rankSkills(
      snapshot.skills,
      snapshot.reviews,
      snapshot.evidence,
      snapshot.skillsets,
    );
    for (const [index, skill] of ranked.entries()) {
      console.log(
        `${index + 1}. ${skill.skill}@${skill.version} score=${skill.score} rating=${skill.averageRating?.toFixed(1) ?? "unrated"} verified=${skill.verifiedRuns}`,
      );
    }
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
