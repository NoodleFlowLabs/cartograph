# Cartograph UI Runtime

This directory contains the source that the local Cartograph UI runs in the
browser. It uses browser-native ES modules plus the vendored
`vendor/htm-preact-standalone.module.js` dependency, so there is no Vite or UI
build step.

Run this from the project root:

```bash
node skills/cartograph/server.mjs
```

The server binds to `127.0.0.1`, serves these files directly, and exposes
purpose-built Cartograph file endpoints.

## Development

1. Edit source directly in `skills/cartograph/ui`.
2. Run `node skills/cartograph/server.mjs`.
3. Open the printed local URL.
4. Refresh the browser after UI source changes.

The UI has no `pnpm build`, Vite dev server, or committed generated bundle.
Server changes still go through `server-src` and `pnpm build:server`.
