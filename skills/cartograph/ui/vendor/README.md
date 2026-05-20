# Vendored UI Runtime

`htm-preact-standalone.module.js` is a local ESM bundle of `htm@3.1.1` with Preact runtime/hooks. It is checked in so `node skills/cartograph/server.mjs` works offline without a CDN or frontend install step.

When updating it, replace the file with a locally vendored bundle and verify no `http://` or `https://` imports remain.
