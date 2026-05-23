# Cartograph UI Runtime

This UI is browser-native source served directly by `skills/cartograph/app/server.mjs`.

Run the one-time dependency install from a checkout that contains the skill:

```bash
pnpm --dir skills/cartograph/app install
```

Then start the local UI:

```bash
pnpm --dir skills/cartograph/app start
```

The server binds to `127.0.0.1`, serves local pnpm-managed runtime modules, and exposes purpose-built Cartograph file endpoints. Edit files under this directory and refresh the browser; there is no Vite build and no generated UI artifact to commit.
