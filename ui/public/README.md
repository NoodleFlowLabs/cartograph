# Cartograph UI Runtime

This directory is generated from the repo-root `ui` workspace.

Run this from the project root:

```bash
npm --prefix skills/cartograph install
npm --prefix skills/cartograph start
```

The install step prepares the skill-local runtime dependencies. The server binds to `127.0.0.1`, serves the bundled React UI, and exposes purpose-built Cartograph file endpoints.
