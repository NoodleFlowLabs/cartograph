# Cartograph Invariant Definitions Format

This document defines the format of the `cartograph-invariants.md` file — a persistent, human-authored and agent-enhanced file that lives at the **repo root**. It contains product-level invariants: assertions about the codebase that should always be true.

Users provide a natural-language one-liner (e.g., "credits are always refunded on failed generations"). The Cartograph agent expands it into a full definition with verification steps, pass criteria, known scope, and a copy-pasteable verification prompt.

## File structure

The file starts with a top-level heading, followed by one `##` section per invariant. Each section has YAML frontmatter between `---` delimiters, followed by markdown body sections.

```markdown
# Cartograph Invariants

## Invariant Display Name

---
id: unique-kebab-case-id
severity: critical
enabled: true
tags: [money, credits]
surfaceIds: [chat-thread, creation-studio]
featureIds: [image-generation]
---

**Assertion:** One-sentence claim that must always be true.

**Verification steps:**
1. Step one...
2. Step two...

**Pass criteria:** What "passing" looks like.

**Known scope:** Which parts of the codebase are relevant.

**Verification prompt:**
> Self-contained prompt for external automation...
```

## Frontmatter fields

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | Yes | string | Unique kebab-case identifier across all invariants. |
| `severity` | Yes | `critical` \| `high` \| `low` | `critical` = money, security, data integrity. `high` = core product logic. `low` = conventions, nice-to-haves. |
| `enabled` | No | boolean | Defaults to `true`. Set to `false` to skip during verification (shown as "paused" in the visualizer). |
| `tags` | No | string[] | Freeform labels for grouping and filtering (e.g., `[money, credits]`, `[auth, security]`, `[media, ui]`). |
| `surfaceIds` | No | string[] | IDs of surfaces this invariant applies to, from a previous `cartograph.json`. When omitted, the invariant is treated as global. |
| `featureIds` | No | string[] | IDs of features this invariant applies to. When omitted, the invariant is treated as global. |

### Notes on scope fields

- `surfaceIds` and `featureIds` are optional scope hints that help the agent focus verification on relevant parts of the codebase.
- They reference IDs from a previous Cartograph scan (`cartograph.json`). If the referenced ID no longer exists, the agent ignores it and verifies based on the assertion text alone.
- When no prior `cartograph.json` exists, omit these fields. They can be added after a full scan.

## Body sections

| Section | Description |
|---|---|
| **Assertion** | The core claim in plain language. This is what the user originally provided, possibly lightly edited for clarity by the agent. |
| **Verification steps** | Numbered, concrete steps the agent should follow to verify this invariant. References specific directories, patterns, function names, or architectural decisions. |
| **Pass criteria** | What "passing" looks like — the specific condition that must hold for this invariant to be considered satisfied. |
| **Known scope** | Which parts of the codebase are relevant. File paths, directories, or patterns the agent should focus on. |
| **Verification prompt** | A self-contained prompt that can be copy-pasted into any LLM-powered tool (Claude Code, Codex, etc.) to verify this invariant independently. Should include enough context that the verifying agent doesn't need to read the full invariant definitions file. |

## Examples

### Example 1: Critical financial invariant

```markdown
## Credits refunded on failed generations

---
id: credits-refunded-on-failure
severity: critical
enabled: true
tags: [money, credits]
surfaceIds: [chat-thread, creation-studio]
featureIds: [image-generation]
---

**Assertion:** When any AI generation operation fails, the user's credits must be refunded.

**Verification steps:**
1. Find all server actions that call AI generation APIs (FAL, OpenAI, etc.)
2. Verify each has error handling that calls a credit refund function on error paths
3. Check that partial failures in parallel generations also trigger refunds for the failed items
4. Verify that timeout/cancellation paths also refund credits

**Pass criteria:** Every generation action has a refund path on failure — no error path should exit without restoring the user's credits.

**Known scope:** Generation actions in `app/chat/*/actions/` and `app/create/actions/`. Credit functions in `lib/credits/`.

**Verification prompt:**
> Read the file cartograph-invariants.md and verify the invariant 'credits-refunded-on-failure'. Check all server actions in app/chat/*/actions/ and app/create/actions/ that call AI generation APIs (look for FAL, OpenAI, or similar API calls). Verify each has error handling that calls a credit refund function on every error path, including partial failures in parallel generations. Report pass/fail with specific file paths and line numbers as evidence.
```

### Example 2: High-severity auth invariant

```markdown
## All production routes require authentication

---
id: auth-on-all-prod-routes
severity: high
enabled: true
tags: [auth, security]
---

**Assertion:** Every user-facing route (except public landing pages and auth callback routes) requires authentication before rendering.

**Verification steps:**
1. List all `page.tsx` files under `app/`
2. For each page, check if it's protected by auth middleware, a layout-level auth check, or a page-level auth guard
3. Identify the exempt routes: landing page (`/`), auth callbacks (`/api/auth/*`), and any explicitly public pages
4. Flag any non-exempt route that renders without an auth check

**Pass criteria:** Every non-exempt route has an auth guard at the page, layout, or middleware level.

**Known scope:** All `app/**/page.tsx` files, middleware at `middleware.ts`, layout auth checks in `app/**/layout.tsx`.

**Verification prompt:**
> Verify the invariant 'auth-on-all-prod-routes'. List all page.tsx files under app/. For each, determine if it is protected by auth middleware, a layout-level auth check, or a page-level guard. Exempt routes: / (landing), /api/auth/* (callbacks). Flag any non-exempt route that can render without authentication. Report pass/fail with evidence.
```

## Important rules

- The agent **never auto-modifies** existing invariant definitions. Definitions are only written during the Add Invariant flow or manually by the user.
- A **stale invariant is just a failing invariant**. If the codebase evolves and an invariant's assumptions no longer hold, it will fail during verification. The user decides whether to fix the code to maintain the invariant, or update the invariant definition to match the new behavior.
- When an invariant has `enabled: false`, it is **skipped** during verification and shown as "paused" in the visualizer. The user can re-enable it by setting `enabled: true` or removing the field entirely.
- To permanently remove an invariant, delete its entire `##` section from the file.
