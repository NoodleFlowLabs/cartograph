# Cartograph UI Runtime

This UI is browser-native source served directly by the Cartograph skill's `app/server.mjs`.

Run the one-time dependency install from a checkout that contains the skill:

```bash
npm --prefix ./agents/skills/cartograph/app install
```

Then start the local UI:

```bash
npm --prefix ./agents/skills/cartograph/app start
```

These commands assume the skill is installed at `./agents/skills/cartograph`. If your agent stores skills in another location, replace `./agents/skills/cartograph/app` with that path plus `/app`.

The server binds to `127.0.0.1`, serves local npm-managed runtime modules, and exposes purpose-built Cartograph file endpoints. Edit files under this directory and refresh the browser; there is no Vite build and no generated UI artifact to commit.
