import { spawnSync } from "node:child_process";

/**
 * opencode plugin that pulls the latest `main` of the directory pointed to by
 * `OPENCODE_CONFIG_DIR` on startup. Best effort: it never throws and never
 * blocks startup; it silently skips when the env var is unset/empty or the
 * directory is not a git work tree (including bare repositories and paths
 * inside a repo's .git directory).
 *
 * @returns {Promise<object>} Empty hooks object (nothing to register).
 */
export default async function remoteConfigAutoUpdater() {
  const configDir = process.env.OPENCODE_CONFIG_DIR;
  if (!configDir) {
    return {};
  }

  try {
    const isRepo = spawnSync(
      "git",
      ["-C", configDir, "rev-parse", "--is-inside-work-tree"],
      {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
        env: process.env,
      },
    );
    if (
      isRepo.error ||
      isRepo.status !== 0 ||
      isRepo.stdout.trim() !== "true"
    ) {
      return {};
    }

    const pull = spawnSync("git", ["-C", configDir, "pull", "origin", "main"], {
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
      env: process.env,
    });
    if (pull.error || pull.status !== 0) {
      const reason = pull.error
        ? pull.error.message
        : (pull.stderr || "").trim() || `exit code ${pull.status}`;
      console.warn(
        `[opencode-remote-config-updater] git pull failed: ${reason}`,
      );
    }
  } catch (error) {
    console.warn(`[opencode-remote-config-updater] skipped: ${error.message}`);
  }

  return {};
}
