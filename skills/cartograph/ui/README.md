# Cartograph UI

Local React UI served by Bun from the installed Cartograph skill.

```bash
UI_DIR=$(find .agents/skills .claude/skills skills "${CODEX_HOME:-$HOME/.codex}/skills" "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills" -path '*/cartograph/ui' -type d -print -quit 2>/dev/null)
test -n "$UI_DIR" || { echo "Cartograph UI not found"; exit 1; }
bun install --cwd "$UI_DIR"
bun "$UI_DIR/server.ts"
```

The server binds to `127.0.0.1`, starts on port `6270` with fallback through `6280`, and serves the React app plus purpose-built file endpoints:

- `GET /api/cartograph`
- `GET /api/cartograph/stream`
- `POST /api/cartograph/save`
- `POST /api/invariants/save`

Set `CARTOGRAPH_PROJECT_ROOT` to point the UI at a specific repository, or run the command from a project containing `cartograph.json`.
