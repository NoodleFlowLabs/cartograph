---
name: deslop
description: Remove AI-generated code slop and clean up code style
---

# Remove AI code slop

Check the diff against main and remove AI-generated slop introduced in the branch.

## Focus Areas

- **Unnecessary comments** - Extra comments that are unnecessary or inconsistent with local style
- **Defensive overkill** - Defensive checks or try/catch blocks that are abnormal for trusted code paths
- **Type escape hatches** - Casts to `any` used only to bypass type issues
- **Deep nesting** - Deeply nested code that should be simplified with early returns
- **Single-use variables** - Variables used once immediately after declaration; inline the RHS instead
- **React prop interfaces** - Separate `interface Props` definitions; inline the props type directly
- **Style drift** - Other patterns inconsistent with the file and surrounding codebase

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1-3 sentences).
