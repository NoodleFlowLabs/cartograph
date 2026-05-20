# Cartograph UI Runtime

This directory contains the browser-native source for the local Cartograph UI.

Run this from the project root:

```bash
node skills/cartograph/server.mjs
```

The server binds to `127.0.0.1`, serves these files directly, and exposes purpose-built Cartograph file endpoints.

Development flow:

1. Edit source files in this directory.
2. Run `node skills/cartograph/server.mjs`.
3. Open the printed local URL.
4. Refresh the browser after UI source changes.

The UI has no Vite dev server, frontend build step, CDN dependency, or committed generated bundle.
