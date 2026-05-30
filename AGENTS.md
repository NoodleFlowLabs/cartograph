## Cartograph UI Stack

The Cartograph UI is intentionally source-served. The runtime should be able to
serve the files committed in `skills/cartograph/app/ui` directly from the local
Node/Hono server without a frontend build step.

Do not introduce a required build, bundle, compile, or generated-asset step for
the app UI. Keep the installed skill transparent: what ships in the repo should
be what the local server can run.

This constraint matters for styling choices. If "current stack" means "serve
source files directly with no generated assets," tools such as Tailwind CSS do
not fit cleanly because they normally require compiling an input stylesheet into
generated CSS. Do not switch the UI to Tailwind, PostCSS, Vite, or similar
build-time tooling unless the project explicitly changes this no-build
constraint first.

Prefer plain CSS, browser-native modules, and small local runtime dependencies
that can be served without transformation.
