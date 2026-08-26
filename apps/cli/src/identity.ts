import { simpleGit } from "simple-git";

export interface DiscoveredIdentity {
  name: string;
  email: string;
}

export async function discoverGitIdentity(overrides: {
  name?: string;
  email?: string;
}): Promise<DiscoveredIdentity> {
  const git = simpleGit();
  const configuredName = overrides.name ?? (await git.getConfig("user.name", "global")).value ?? undefined;
  const configuredEmail = overrides.email ?? (await git.getConfig("user.email", "global")).value ?? undefined;
  if (!configuredName || !configuredEmail) {
    throw new Error(
      "Git identity is missing. Set `git config --global user.name` and `user.email`, or pass --display-name and --email.",
    );
  }
  return { name: configuredName, email: configuredEmail };
}
