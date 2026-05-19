# Cartograph UI Source

This workspace contains the React source for the local Cartograph UI.

Build output is committed into `../skills/cartograph/ui` so the installed skill can run without installing frontend dependencies.

## Commands

```bash
pnpm install
pnpm build:ui
pnpm dev:ui
```

The local runtime server lives in `../server-src` and is bundled to `../skills/cartograph/server.mjs`.

## Runtime API

- `GET /api/cartograph`
- `GET /api/cartograph/stream`
- `POST /api/cartograph/save`
- `POST /api/invariants/save`

The React app is the source for the bundled local visualizer. The built output in `../skills/cartograph/ui` is what gets installed with the skill.
