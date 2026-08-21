# opencode-remote-config-auto-updater-plugin

A zero-dependency [opencode](https://opencode.ai) plugin that runs `git pull origin main` on the directory pointed to by the `OPENCODE_CONFIG_DIR` environment variable every time opencode starts, so your shared configuration is always up to date.

## Behavior

- Pulls the `main` branch of `OPENCODE_CONFIG_DIR` at startup, before your session begins.
- **Silently skips** when `OPENCODE_CONFIG_DIR` is unset or empty.
- **Silently skips** (no error, no warning) when the directory is not a git repository or work tree (bare repositories and `.git` directories included).
- Best effort: a missing `git` binary, network failures, or merge conflicts can produce a warning at most — opencode startup never crashes because of this plugin.

## Installation

1. **Global (recommended):** drop `plugin.js` into `$OPENCODE_CONFIG_DIR/plugins/plugin.js` — i.e. `~/.config/opencode/plugins/plugin.js`. Any `*.js` or `*.ts` file there is auto-loaded at startup.
2. **Project-level:** drop `plugin.js` into `<your-project>/.opencode/plugins/plugin.js` for a per-project install.
3. **Via config:** add it to the `plugin` array in `opencode.json`:

```json
{
  "plugin": ["/absolute/path/to/plugin.js"]
}
```

Relative paths in `opencode.json` are resolved against the config file that declares them.

4. **From GitHub (npm-style):** add the GitHub repo to the `plugin` array in `opencode.json`:

```json
{
  "plugin": ["github:webdex-uk/opencode-remote-config-auto-updater-plugin"]
}
```

You can pin a tag or revision with `#<ref>` (e.g. `...#main` or `...#v0.1.0`). It is installed automatically with Bun at startup and cached in `~/.cache/opencode/node_modules/`.

> **Restart opencode** after installing for the plugin to take effect.

## How it works

At startup the plugin checks that `OPENCODE_CONFIG_DIR` is a git work tree (`git rev-parse --is-inside-work-tree` must print exactly `true`) and, if so, runs `git pull origin main` in it — both via `spawnSync` from `node:child_process`, with every failure swallowed.
