import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Dual V1/V2 opencode plugin entrypoint that pulls the latest `main` of the opencode
 * config repository on startup.
 *
 * - V1 (>= 1.18.29) calls `server`: uses `OPENCODE_CONFIG_DIR` only, exactly like
 *   v0.1.0 — when that variable is unset or empty, the plugin skips silently.
 * - V2 calls `setup`: same logic, but when `OPENCODE_CONFIG_DIR` is unset or empty it
 *   falls back to the standard config directory `~/.config/opencode`.
 *
 * Both halves are best effort: they never throw and never block startup; they silently
 * skip when the directory is not a git work tree (including bare repositories and paths
 * inside a repo's .git directory).
 */

/**
 * Resolve the config directory to pull.
 *
 * @param {boolean} [useFallback] When true and `OPENCODE_CONFIG_DIR` is unset or empty,
 *   fall back to the standard config directory `~/.config/opencode`.
 * @returns {string|undefined} The config directory to pull, if any.
 */
function resolveConfigDir(useFallback = false) {
  const fromEnv = process.env.OPENCODE_CONFIG_DIR;
  if (fromEnv || !useFallback) {
    return fromEnv;
  }
  return join(homedir(), ".config", "opencode");
}

/**
 * Best-effort `git pull origin main` on `configDir`: never throws, never blocks startup,
 * skips non-repo deployments and unset paths.
 *
 * @param {string|undefined} configDir
 */
function pullConfigRepo(configDir) {
  if (!configDir) {
    return;
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
      return;
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
}

// V1 half — exact v0.1.0 behavior: env var only, returns an empty hooks map.
const server = async () => {
  pullConfigRepo(resolveConfigDir(false));
  return {};
};

// V2 half — env var, else the standard config dir; still skipped when not a git work tree.
const setup = async () => {
  pullConfigRepo(resolveConfigDir(true));
};

export default { id: "config-auto-updater", server, setup };
