# EventLog Isles — project instructions

These override or extend the platform `AGENTS.md` **for this repo only**.

## Path map — Grok sandbox vs local clone

Absolute paths under `/workspace` and `/home/workdir/...` exist **only inside
Grok Linux sandboxes**. They are **not** valid on a developer's laptop.
Hard-coding the wrong root is how agents edit/build/deploy the wrong tree
(e.g. old PNG assets while GitHub already has WebP).

### Detect the project root every session

```sh
if [ -f /workspace/package.json ]; then
  ROOT=/workspace                          # App Builder / live-preview sandbox
elif [ -f /home/workdir/artifacts/package.json ]; then
  ROOT=/home/workdir/artifacts             # Project-conversation agent mount
else
  ROOT="$(pwd)"                            # local clone / current shell
fi
cd "$ROOT"
```

### Where each environment lives

| Environment | Project root | Notes |
| --- | --- | --- |
| **Grok App Builder / live preview** | `/workspace` | Preview on `0.0.0.0:8080`. Platform `startup.sh` contract targets this tree. |
| **Grok project conversation agent** | `/home/workdir/artifacts` | Fuse-mounted persistent dir. **May not have `/workspace`.** Prefer writing durable files here. |
| **Local clone (GitHub)** | Clone directory | e.g. after `git clone https://github.com/xesrevinu/effect-event-log-isles`. No Grok absolute paths. Relative paths only. |

### Rules

1. **Never assume `/workspace` exists** in project-agent sessions — use `/home/workdir/artifacts` when that is the mount.
2. **Never assume `/home/workdir/artifacts` exists** in App Builder preview — use `/workspace`.
3. **GitHub is source of truth for OSS:** `https://github.com/xesrevinu/effect-event-log-isles`. If the sandbox lags `origin/main`, run `git fetch && git pull --ff-only` **in the detected root** before blaming assets or deploy.
4. **Publish packages the sandbox project root**, not a `/tmp` clone. Syncing GitHub into `/tmp` does not update preview or the publish button.
5. **`startup.sh`** should resolve its own directory (`ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"`) so one script works in App Builder, project agents, and local clones.
6. **Local developers** ignore every `/workspace` or `/home/workdir/...` path. From the clone root: `npm ci && npm run dev` / `build` / `typecheck` / `lint` / `format`.

## Toolchain

- **Typecheck:** TypeScript 7 (`npm run typecheck` → `tsc --noEmit`)
- **Lint:** oxlint (`.oxlintrc.json`, `npm run lint`)
- **Format:** oxfmt (`.oxfmtrc.json`, `npm run format`)
- Do **not** reintroduce ESLint / Prettier configs or deps; script names stay the same.

### Quick self-check

```sh
pwd
ls package.json public src
test -f /workspace/package.json && echo "root-hint: /workspace"
test -f /home/workdir/artifacts/package.json && echo "root-hint: /home/workdir/artifacts"
git remote -v; git log -1 --oneline
```

If `public/pets/**` or `public/icons/**` still show `.png` while `origin/main` has `.webp`, the sandbox tree is **stale** — pull or resync before publish.

## App Builder adapt layer (required to preview + deploy)

This layer used to live only in the live App Builder template. It is now in
this repo so clone, sandbox preview, `npm run build`, and grok.me stay aligned.

| File | Why |
| --- | --- |
| `.grok/app-env.json` | Isles has **no login**. `VITE_AUTH_ENABLED=false`. |
| `scripts/with-app-env.mjs` | Wraps **every** Vite command. Never start `vite` directly. |
| `scripts/app-env-plugin.mjs` | Dev-only `/__app-env` for the auth-flag invariant. |
| `.npmrc` | `legacy-peer-deps=true` — effect 4 vs `@hookform/resolvers` optional peer. |

`package.json` scripts:

```
dev / build / build:dev / preview  →  node scripts/with-app-env.mjs vite …
```

`vite.config.ts` contract:

- `server`: `0.0.0.0:8080` `strictPort` (live preview)
- `preview`: `127.0.0.1:8081` `strictPort` (must **not** steal 8080)
- `resolve.alias['@']` → `./src` (TypeScript 7 removed `baseUrl`; do not add it back)
- `appEnvPlugin()` in the plugin list
- `nitro({ preset: "vercel", serverDir: "./server" })` only when `command === "build" || isPreview`

Do **not** copy a newer App Builder `AGENTS.md` over this repo's — platform
docs change per sandbox; this file plus the files above are what deploys.

## Product

Public OSS educational pet game for Effect EventLog. Production:
<https://effect-event-log.grok.me>
