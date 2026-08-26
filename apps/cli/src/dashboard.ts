import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

export async function resolveWebDirectory(override?: string): Promise<string> {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    override,
    process.env.SKILLSPACE_WEB_DIRECTORY,
    resolve(moduleDirectory, "../../web"),
    resolve(process.cwd(), "apps/web"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const directory = resolve(candidate);
    try {
      const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8")) as {
        name?: string;
      };
      if (manifest.name === "@skillspace/web") return directory;
    } catch {
      // Try the next supported monorepo or explicit location.
    }
  }
  throw new Error(
    "SkillRoster web client was not found. Set SKILLSPACE_WEB_DIRECTORY or run from the monorepo.",
  );
}

async function waitUntilReady(url: string, timeoutMs = 30_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The local server is still compiling.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  }
  throw new Error(`Dashboard did not become ready within ${timeoutMs / 1000} seconds`);
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const command = platform === "win32" ? "cmd" : platform === "darwin" ? "open" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

export async function launchDashboard(input: {
  registry: string;
  member: string;
  hostname: string;
  port: number;
  open: boolean;
  development?: boolean;
  webDirectory?: string;
}): Promise<void> {
  const webDirectory = await resolveWebDirectory(input.webDirectory);
  const productionServer = join(webDirectory, "dist-server", "server.cjs");
  const hasProductionBuild =
    (await exists(join(webDirectory, "dist", "index.html"))) && (await exists(productionServer));
  const development = input.development || !hasProductionBuild;
  const tsxExecutable = join(webDirectory, "node_modules", "tsx", "dist", "cli.mjs");
  if (development && !(await exists(tsxExecutable))) {
    throw new Error(`React dashboard dependencies are missing. Run pnpm install in ${webDirectory}`);
  }
  const executable = development ? tsxExecutable : productionServer;
  const serverArguments = [
    executable,
    ...(development ? [join(webDirectory, "src", "server.ts"), "--dev"] : []),
    "--hostname",
    input.hostname,
    "--port",
    String(input.port),
  ];
  const url = `http://${input.hostname === "0.0.0.0" ? "127.0.0.1" : input.hostname}:${input.port}`;
  const child = spawn(
    process.execPath,
    serverArguments,
    {
      cwd: webDirectory,
      env: {
        ...process.env,
        SKILLSPACE_REGISTRY: input.registry,
        SKILLSPACE_MEMBER: input.member,
      },
      stdio: "inherit",
      windowsHide: true,
    },
  );

  const earlyExit = new Promise<never>((_, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`Dashboard exited before startup (code ${code})`)));
  });
  await Promise.race([waitUntilReady(url), earlyExit]);
  console.log(`SkillRoster dashboard: ${url}`);
  if (input.open) openBrowser(url);

  await new Promise<void>((resolvePromise, reject) => {
    child.removeAllListeners("exit");
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0 || code === null) resolvePromise();
      else reject(new Error(`Dashboard exited with code ${code}`));
    });
    const stop = () => child.kill("SIGINT");
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}
