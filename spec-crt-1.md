# CRT-1: Bun + React Foundation for the Cartograph UI

## Overview

Replace the static `visualizer.html` with a Bun + React local-server foundation, bundled inside the Cartograph skill. The user starts the UI by running a single command (`bun server.ts`) on files that already live on their machine after `npx skills add NoodleFlowLabs/cartograph`. The UI is the same as today, ported 1:1 to React components, but it now runs against a lightweight local server that adds file-mutation capability and live updates when `cartograph.json` changes on disk.

This ticket establishes the foundation only. Projects/chats sidebar, chat history, mapping chat, and agent-CLI orchestration are deferred to future tickets.

## Goals

- Replace the single 7795-line `skills/cartograph/assets/visualizer.html` with a maintainable React component tree.
- Make the UI bidirectional: it can write files back to the project (e.g., update `cartograph.json`, update `cartograph-invariants.md`).
- Keep the source transparent — every file the user sees in the installed skill is the source that runs. No build artifacts, no `dist/`.
- Start command is direct and obvious: `bun skills/cartograph/ui/server.ts` from the project root.
- Live-refresh the UI when `cartograph.json` changes on disk (after a re-run of `/cartograph`).
- Preserve the existing UX 1:1; do not redesign in this ticket.

## Non-Goals (explicitly out of scope)

- Projects/chats sidebar in the left rail.
- Chat history persistence or display.
- "Mapping chat" as the mandatory first chat in a project.
- Multi-project workspace (one server managing several repos).
- Spawning `claude`, `codex`, or other agent CLIs as child processes from the server. Prompts remain copy-paste.
- Generic read-any/write-any file system API (`/api/fs/*`). Only purpose-built endpoints in this ticket.
- Auth tokens, login flows, or any multi-user concept.
- UI redesign or new visualizations.
- Hosted/online version of the new UI (the hosted page becomes a launcher only, see below).

## User Types

Single user type: a developer working in their own repo who has installed the Cartograph skill. No accounts, no permissions model.

## Distribution & Install

Distribution is handled by the existing skills mechanism. No npm publish, no separate package.

1. User runs `npx skills add NoodleFlowLabs/cartograph --skill cartograph`. This installs the skill files locally, including `skills/cartograph/ui/*`.
2. Bun is a prerequisite. The skill's README and `SKILL.md` link to `https://bun.sh` for install instructions. If Bun is missing when the user tries to start, the agent surfaces the install URL.
3. From the project root, the user runs:

   ```bash
   bun skills/cartograph/ui/server.ts
   ```

4. On first run, the server checks for `skills/cartograph/ui/node_modules`. If missing, it prints:

   ```
   Dependencies not installed. Run:
     bun install --cwd skills/cartograph/ui
   ```

   and exits with code 1. (No auto-install — keep behavior transparent.)

5. On successful start, the server prints:

   ```
   Cartograph UI running at http://127.0.0.1:6270
   Project root: /Users/.../my-repo
   Watching: cartograph.json
   ```

## File Layout

```
skills/cartograph/
  SKILL.md
  assets/
    cartograph-logo.svg          # kept here; UI imports from ../assets/
  references/
    invariant-definitions-format.md
    json-schema.md
  ui/                            # NEW
    server.ts                    # entrypoint
    index.html                   # root HTML imported by server.ts
    package.json                 # React, @types/react, etc.
    tsconfig.json                # only needed for editor LSP; Bun ignores it
    src/
      main.tsx                   # createRoot, renders <App/>
      App.tsx
      components/                # ported visualizer panels, broken out as needed
      lib/
        api.ts                   # fetch wrappers for /api/cartograph, SSE, etc.
        types.ts                 # cartograph.json schema types
      styles.css
```

`skills/cartograph/assets/visualizer.html` is **deleted**. The repo-root `visualizer.html` redirect is **replaced** with a page that displays the local launch command (see "Hosted Visualizer Replacement").

## Server (`ui/server.ts`)

A single file using `Bun.serve` with HTML imports.

### Responsibilities

1. Determine `projectRoot`. Strategy:
   - If `CARTOGRAPH_PROJECT_ROOT` env var is set, use it.
   - Else walk up from `process.cwd()` looking for `cartograph.json`. If found, use that directory.
   - Else use `process.cwd()` (and log a warning that `cartograph.json` was not found).
2. Bind to `127.0.0.1` only. Reject requests whose `Origin` header is set to anything other than `http://127.0.0.1:<port>` or `http://localhost:<port>`. Requests with no `Origin` (e.g., the initial HTML navigation) are allowed.
3. Choose a port: try **6270** ("MAP" on T9 keypad + 0). If `EADDRINUSE`, increment and retry up to port 6280. Print the final URL.
4. Serve the React app via HTML import:

   ```ts
   import index from "./index.html";

   Bun.serve({
     port: chosenPort,
     hostname: "127.0.0.1",
     development: true,
     routes: {
       "/": index,
       "/api/cartograph": { GET: handleGetCartograph },
       "/api/cartograph/stream": { GET: handleCartographStream },
       "/api/cartograph/save": { POST: handleSaveCartograph },
       "/api/invariants/save": { POST: handleSaveInvariants },
     },
     fetch(req) {
       // Origin check applied here in a wrapper around routes
     },
   });
   ```

   `development: true` enables HMR for `.tsx`/`.css` via Bun's built-in bundler.
5. Watch `<projectRoot>/cartograph.json` using `fs.watch` (or `Bun.watch` when stable). On change, debounce 200ms, then push an SSE event to all connected `/api/cartograph/stream` clients.

### Endpoints

| Method | Path | Behavior |
|---|---|---|
| GET | `/` | Serves the React SPA (HTML import). |
| GET | `/api/cartograph` | Reads `<projectRoot>/cartograph.json` and returns it as JSON. `404` if missing. |
| GET | `/api/cartograph/stream` | SSE stream. Emits a single event type `cartograph-changed` with no payload whenever the file changes (debounced 200ms). Client re-fetches `/api/cartograph` on receipt. |
| POST | `/api/cartograph/save` | Body: full JSON of new `cartograph.json`. Validates it parses as JSON. Writes atomically (write to `.cartograph.json.tmp`, rename). Returns `{ ok: true }`. |
| POST | `/api/invariants/save` | Body: `{ contents: string }`. Writes to `<projectRoot>/cartograph-invariants.md`. Same atomic write pattern. Returns `{ ok: true }`. |

### Path safety

All writes go through a helper:

```ts
function resolveInProjectRoot(rel: string): string {
  const abs = path.resolve(projectRoot, rel);
  if (!abs.startsWith(projectRoot + path.sep)) {
    throw new Error("path escapes project root");
  }
  return abs;
}
```

Endpoints in this ticket only write to fixed relative paths (`cartograph.json`, `cartograph-invariants.md`), but the helper is in place for future endpoints.

### Origin check

Implemented as a `fetch` wrapper that runs before the routes map:

```ts
fetch(req, server) {
  const origin = req.headers.get("origin");
  const allowed = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  if (origin && !allowed.includes(origin)) {
    return new Response("forbidden origin", { status: 403 });
  }
  // fall through to routes
}
```

## UI (`ui/src/`)

### Stack

- React 19 (or current latest Bun supports without flags).
- TypeScript via Bun's native transpile. No `tsc` build, no Vite.
- Plain CSS in `styles.css`. No CSS-in-JS, no Tailwind in this ticket — match the current visualizer's styling.

### Behavior

1. On mount, `App.tsx` fetches `GET /api/cartograph` and stores it in state.
2. Opens an `EventSource` to `/api/cartograph/stream`. On `cartograph-changed`, re-fetches `/api/cartograph` and updates state.
3. Renders the visualizer UI 1:1 with the existing `visualizer.html`. All panels, tabs, scores, and views are reproduced.
4. Where the current static UI has "copy prompt" buttons, those buttons remain copy-to-clipboard only (no exec).
5. Whatever editing affordances the current UI has (or that are trivial to add) write through `POST /api/cartograph/save` or `POST /api/invariants/save`. If the current static UI has zero edit affordances, none are added in this ticket — the endpoints exist for future tickets to call.

### Porting strategy

- Read the existing `visualizer.html` end-to-end.
- Identify the top-level panels/regions (e.g., overview, surfaces, features, flows, file tree map, data model, code health, invariants).
- Each top-level region becomes one `components/*.tsx` file.
- Shared rendering helpers (formatting, score display, etc.) go in `lib/`.
- Preserve class names where reasonable so the existing CSS can be carried over with minimal churn.

## Hosted Visualizer Replacement

Today, `tools.cartograph.sh/visualizer` and the repo-root `visualizer.html` redirect to `skills/cartograph/assets/visualizer.html`.

After this ticket:

- Repo-root `visualizer.html` becomes a small static page (no redirect) showing:

  > **Cartograph runs locally.** After installing the skill, run:
  > ```
  > bun skills/cartograph/ui/server.ts
  > ```
  > from your project root, then open http://127.0.0.1:6270.

- `tools.cartograph.sh/visualizer` shows the same page (deployed from the same file, or a duplicated copy — operationally the same change).

No drag-and-drop hosted viewer. Users who want to view a `cartograph.json` without running locally are not served by this ticket.

## Documentation Updates

- `README.md`: replace step 3 ("Open the bundled visualizer") with the `bun` launch command. Note Bun as a prerequisite.
- `skills/cartograph/SKILL.md`: update wherever it tells the agent to direct the user to the visualizer. The new instruction is to run `bun skills/cartograph/ui/server.ts` from the project root.
- Add a short `skills/cartograph/ui/README.md` describing the entrypoint and endpoints, for future contributors.

## Edge Cases & Error Handling

| Case | Behavior |
|---|---|
| `bun` not installed | Out of our control — `bun` command not found. `SKILL.md` and README link to bun.sh. |
| `node_modules` missing in `ui/` | Server prints the install command and exits 1 (no auto-install). |
| `cartograph.json` not found at start | Server starts anyway. UI shows: "No cartograph.json found in `<projectRoot>`. Run `/cartograph` from your agent." |
| `cartograph.json` malformed | `/api/cartograph` returns `500` with `{ error: "invalid JSON", line, col }`. UI displays a parse error panel. |
| Port 6270–6280 all in use | Server exits 1 with a clear message: "All candidate ports busy (6270–6280). Set `CARTOGRAPH_PORT` to override." |
| `CARTOGRAPH_PORT` env var set | Override port selection entirely. No fallback. |
| File watcher fires repeatedly during a write | 200ms debounce before SSE push. |
| User saves an invariants file with invalid syntax | Server does not validate Markdown syntax. Writes raw contents. (Validation is a future concern.) |
| Request from a non-localhost origin | `403 forbidden origin`. |
| Browser sends `Origin: null` (e.g., file://) | Treated as disallowed; 403. UI must be served from the local server. |

## Acceptance Criteria

1. From a clean install (`npx skills add NoodleFlowLabs/cartograph`), running `bun skills/cartograph/ui/server.ts` from a project that contains `cartograph.json` opens a working UI at `http://127.0.0.1:6270` that visually matches the current `visualizer.html`.
2. Running `/cartograph` in the agent (which rewrites `cartograph.json`) causes the open UI to refresh automatically within ~500ms.
3. `POST /api/cartograph/save` with valid JSON updates `cartograph.json` on disk, and the UI reflects the change (via the SSE refresh).
4. A request to any endpoint with an `Origin` header pointing at any host other than `127.0.0.1` or `localhost` returns 403.
5. `skills/cartograph/assets/visualizer.html` is removed from the repo.
6. Repo-root `visualizer.html` no longer redirects; it shows the local launch instructions.
7. README and `SKILL.md` reference the new launch command.

## Open Questions (deferred, not blocking)

- Should the server eventually offer a `--no-browser` flag and conversely auto-open the browser by default? (Default for this ticket: do not auto-open.)
- When the user runs the server in a repo without `cartograph.json`, should it prompt them to run `/cartograph` first, or just show an empty state? (Default: empty state with a hint.)
- Long-term, will the agent CLI ever call the local server directly (e.g., to push updates without going through `cartograph.json` on disk)? Out of scope here, but informs future API design.

## Future Considerations

- Projects/chats sidebar (left rail), with the top chat per project being the mandatory mapping chat.
- Chat history persisted in `.cartograph/` (state directory).
- Agent CLI orchestration: the server spawns `claude`/`codex` as child processes and streams stdout via SSE.
- Multi-project workspace mode.
- Auth/token model if we ever expose the server beyond localhost.
- Generic `/api/fs/*` API once the surface stabilizes.
- A pre-built static fallback for `tools.cartograph.sh/visualizer` (drag-and-drop only).
