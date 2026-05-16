# Cartograph UI

Local React UI served by Bun from the installed Cartograph skill.

```bash
bun install --cwd skills/cartograph/ui
bun skills/cartograph/ui/server.ts
```

The server binds to `127.0.0.1`, starts on port `6270` with fallback through `6280`, and serves the React app plus purpose-built file endpoints:

- `GET /api/cartograph`
- `GET /api/cartograph/stream`
- `POST /api/cartograph/save`
- `POST /api/invariants/save`

Set `CARTOGRAPH_PROJECT_ROOT` to point the UI at a specific repository, or run the command from a project containing `cartograph.json`.
