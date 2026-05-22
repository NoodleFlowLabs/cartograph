# Cartograph Invariants Spec

## Overview

Add product invariants to Cartograph — assertions about the codebase that should always be true, verified by the agent during scans and on demand. Invariants catch regressions in core product behavior (credit refunding, auth guards, data integrity) that tests might not cover because they span multiple files and require understanding product intent, not just code correctness.

Invariant definitions live in a persistent markdown file in the repo. Verification results are written into `cartograph.json` as a top-level key and displayed in a dedicated visualizer tab.

## Goals

- Let users define product-level assertions in natural language and have the agent expand them into thorough, verifiable definitions
- Verify invariants during every full Cartograph scan and via a lightweight standalone verify mode
- Surface pass/fail results with specific violations and actionable evidence
- Generate copy-pasteable prompts so invariants can be verified by external automation (Codex, Claude Code scheduled runs, CI agents)
- Keep definitions human-authored and agent-enhanced — the agent never auto-modifies definitions

## Non-Goals

- Auto-discovery of invariants (agent doesn't suggest invariants unprompted — user defines them)
- Auto-fixing violations (the agent reports, the user decides)
- Auto-updating stale invariant definitions (a stale invariant simply fails; the user decides whether to fix the code or update the definition)
- History tracking across runs (V1 stores latest result only; git history provides the audit trail)
- Test generation from invariants (invariants are a complementary verification layer, not a test framework)

## Implementation Note: Persistent Reference Documents

This spec will not ship in the final Cartograph skill directory. Two reference documents must be created during implementation so the format information survives:

1. **`references/invariant-definitions-format.md`** — Documents the `cartograph-invariants.md` file format: frontmatter fields, body sections, examples. This is the authoritative reference for how invariant definitions are authored and structured. Create this in the Cartograph skill's `references/` directory alongside `json-schema.md`.

2. **Update `references/json-schema.md`** — Add the `invariants` top-level key schema (verification results) to the existing JSON schema reference.

Both documents must be created before any other implementation work begins, since all other code (SKILL.md changes, visualizer, agent logic) depends on these formats.

## Invariant Definition Format

Definitions live in `cartograph-invariants.md` at the repo root. Each invariant is a markdown section with YAML frontmatter.

### File structure

```markdown
# Cartograph Invariants

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

**Pass criteria:** Every generation action has a refund path on failure.

**Known scope:** Generation actions in `app/chat/*/actions/` and `app/create/actions/`

**Verification prompt:**
> Read the file cartograph-invariants.md and verify the invariant 'credits-refunded-on-failure'.
> Check all server actions in app/chat/*/actions/ and app/create/actions/ that call AI generation APIs.
> Verify each has error handling that calls a credit refund function. Report pass/fail with evidence.
```

### Frontmatter fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique kebab-case identifier. Must be globally unique across all invariants. |
| `severity` | Yes | `critical`, `high`, or `low`. Determines how failures are treated in verify mode. |
| `enabled` | No | Defaults to `true`. Set to `false` to skip during verification (shown as "paused" in visualizer). |
| `tags` | No | Freeform labels for grouping/filtering (e.g., `[money, credits]`, `[auth, security]`, `[media, ui]`). |
| `surfaceIds` | No | IDs of surfaces this invariant applies to (from a previous Cartograph scan). Helps the agent focus verification. |
| `featureIds` | No | IDs of features this invariant applies to. Helps the agent focus verification. |

- `surfaceIds` and `featureIds` are optional scope hints. When omitted, the invariant is treated as global (applies to the entire codebase).
- Scope fields reference IDs from a previous `cartograph.json`. If the referenced ID no longer exists, the agent ignores it and verifies based on the assertion text alone.

### Body sections

The body below the frontmatter contains these sections, all written by the agent during invariant creation:

| Section | Description |
|---|---|
| **Assertion** | The core claim in plain language. This is what the user originally provided, possibly lightly edited for clarity. |
| **Verification steps** | Numbered, concrete steps the agent should follow to verify this invariant. References specific directories, patterns, function names, or architectural decisions. |
| **Pass criteria** | What "passing" looks like — the specific condition that must hold. |
| **Known scope** | Which parts of the codebase are relevant. File paths, directories, or patterns the agent should focus on. |
| **Verification prompt** | A self-contained prompt that can be copy-pasted into any LLM-powered tool to verify this invariant independently. Should include enough context that the verifying agent doesn't need to read the full invariant definition file. |

## JSON Schema — `invariants` key in cartograph.json

Verification results are written as a top-level `invariants` key in `cartograph.json`, parallel to `surfaces`, `features`, `codeHealth`, etc.

```json
{
  "invariants": {
    "verifiedAt": "2025-01-15T10:30:00Z",
    "definitionsFile": "cartograph-invariants.md",
    "summary": {
      "total": 4,
      "passing": 3,
      "failing": 1,
      "skipped": 0
    },
    "results": [ ... ]
  }
}
```

- `verifiedAt` — ISO 8601 timestamp of when invariants were last verified
- `definitionsFile` — path to the invariant definitions file (relative to repo root)
- `summary` — aggregate counts. `skipped` = invariants with `enabled: false`
- `results[]` — one entry per invariant

### Result schema — passing

```json
{
  "id": "credits-refunded-on-failure",
  "name": "Credits refunded on failed generations",
  "severity": "critical",
  "status": "pass",
  "summary": "All 4 generation actions have refund paths on error",
  "tags": ["money", "credits"],
  "surfaceIds": ["chat-thread", "creation-studio"],
  "featureIds": ["image-generation"],
  "evidence": {
    "checkedFiles": [
      "app/chat/[personaSlug]/actions/generate-image.ts",
      "app/chat/[personaSlug]/actions/generate-video.ts",
      "app/create/actions/generate.ts",
      "app/create/actions/remix.ts"
    ],
    "violations": []
  },
  "verificationPrompt": "Read the file cartograph-invariants.md and verify the invariant 'credits-refunded-on-failure'. Check all server actions in app/chat/*/actions/ and app/create/actions/ that call AI generation APIs. Verify each has error handling that calls a credit refund function. Report pass/fail with evidence.",
  "fixPrompt": null
}
```

### Result schema — failing

```json
{
  "id": "thumbnail-aspect-ratios",
  "name": "Thumbnail aspect ratios match media",
  "severity": "high",
  "status": "fail",
  "summary": "1 of 3 thumbnail generation paths produces incorrect aspect ratios",
  "tags": ["media", "ui"],
  "surfaceIds": [],
  "featureIds": ["media-upload", "thumbnail-generation"],
  "evidence": {
    "checkedFiles": [
      "app/media/components/thumbnail-generator.tsx",
      "app/upload/actions/process-media.ts",
      "lib/media/resize.ts"
    ],
    "violations": [
      {
        "file": "lib/media/resize.ts",
        "line": 45,
        "expected": "Thumbnail aspect ratio matches source media dimensions",
        "found": "Hardcoded 1:1 center crop for all thumbnails regardless of source aspect ratio",
        "suggestion": "Use source media dimensions to calculate thumbnail crop area"
      }
    ]
  },
  "verificationPrompt": "Read the file cartograph-invariants.md and verify the invariant 'thumbnail-aspect-ratios'. Check all thumbnail generation code in app/media/ and lib/media/. For each thumbnail generation path, verify that the output aspect ratio matches the source media's aspect ratio. Report pass/fail with evidence.",
  "fixPrompt": "Read the invariant 'thumbnail-aspect-ratios' in cartograph-invariants.md. The invariant is currently failing. Fix the violation in lib/media/resize.ts at line 45: the thumbnail generation uses a hardcoded 1:1 center crop for all thumbnails regardless of source aspect ratio. Update the resize logic to use source media dimensions to calculate the thumbnail crop area, preserving the original aspect ratio. After fixing, verify the invariant holds by checking all thumbnail generation paths."
}
```

### Result schema — skipped (disabled)

```json
{
  "id": "some-paused-invariant",
  "name": "Some paused invariant",
  "severity": "low",
  "status": "skipped",
  "summary": "Invariant is disabled (enabled: false)",
  "tags": [],
  "surfaceIds": [],
  "featureIds": [],
  "evidence": null,
  "verificationPrompt": null,
  "fixPrompt": null
}
```

### Field reference

| Field | Type | Description |
|---|---|---|
| `id` | string | Matches the `id` from the invariant definition frontmatter |
| `name` | string | The invariant's heading from the definitions file |
| `severity` | `"critical"` \| `"high"` \| `"low"` | From definition frontmatter |
| `status` | `"pass"` \| `"fail"` \| `"skipped"` | Verification result |
| `summary` | string | One-sentence plain-language summary of the result |
| `tags` | string[] | From definition frontmatter |
| `surfaceIds` | string[] | From definition frontmatter (may be empty) |
| `featureIds` | string[] | From definition frontmatter (may be empty) |
| `evidence` | object \| null | Null for skipped invariants |
| `evidence.checkedFiles` | string[] | All files the agent examined during verification |
| `evidence.violations` | object[] | Empty array for passing invariants |
| `evidence.violations[].file` | string | File path where the violation was found |
| `evidence.violations[].line` | number \| null | Line number if applicable |
| `evidence.violations[].expected` | string | What should have been true |
| `evidence.violations[].found` | string | What was actually found |
| `evidence.violations[].suggestion` | string | Concrete recommendation for fixing the violation |
| `verificationPrompt` | string \| null | Copy-pasteable prompt to re-verify this invariant. Shown in the visualizer when the invariant is passing. Null for skipped. |
| `fixPrompt` | string \| null | Copy-pasteable prompt to fix the failing invariant. Includes specific violation details and file paths. Shown in the visualizer when the invariant is failing. Null for passing or skipped. |

This key is **optional for backwards compatibility**. When absent, the visualizer shows a graceful "No invariant data" state.

## User Flows

### Flow 1: Add an invariant

1. User runs `/cartograph` with a natural-language request containing "invariant" or "add invariant" — e.g., `/cartograph add this invariant: "credits are always refunded on failed generations"`
2. The agent detects the user's intent is to add an invariant (not run a full scan)
3. The agent reads the codebase to understand the assertion:
   - Identifies relevant files, functions, and patterns
   - Determines which surfaces and features are involved (if a previous `cartograph.json` exists, reference its IDs)
   - Maps out the verification approach
4. The agent expands the one-liner into a full invariant definition with all body sections (assertion, verification steps, pass criteria, known scope, verification prompt)
5. The agent writes the invariant to `cartograph-invariants.md`:
   - If the file doesn't exist, create it with a `# Cartograph Invariants` heading
   - Append the new invariant section
6. The agent runs an initial verification to confirm the invariant currently holds
7. The agent reports the result:
   - If passing: "Invariant holds. Definition saved to cartograph-invariants.md."
   - If failing: "Invariant does NOT currently hold. Definition saved anyway — here are the violations: [details]. You can fix the code to make it pass, or edit the invariant definition if the assertion needs adjusting."

### Flow 2: Full Cartograph scan with invariant verification

1. User runs `/cartograph` (standard full scan)
2. Waves 0–3 proceed as normal
3. In Wave 3.5 (Code Health), a new **Agent 11 — Invariant Verification** runs in parallel with agents 8–10:
   - Reads `cartograph-invariants.md` from the repo root
   - If the file doesn't exist, skip silently (no error, no invariants section in output)
   - For each enabled invariant, follows the verification steps and produces a result
   - Returns the `invariants` object for the JSON output
4. Wave 4–5 proceed as normal
5. In Wave 5 (assembly), the orchestrator includes the `invariants` key in `cartograph.json`
6. Console output includes an invariant summary alongside the code health summary

### Flow 3: Standalone verify

1. User runs `/cartograph verify` (or any natural-language variant like `/cartograph check my invariants`)
2. The agent reads `cartograph-invariants.md`
   - If the file doesn't exist: "No invariant definitions found. Add one with: /cartograph add this invariant: '...'"
3. For each enabled invariant, the agent runs verification
4. The agent prints a pass/fail summary to the console:
   ```
   Invariant Results (4 checked)
   ──────────────────────────────────
   ✓ CRITICAL  Credits refunded on failure
     All 4 generation actions have refund paths

   ✗ HIGH  Thumbnail aspect ratios match media
     Violation in lib/media/resize.ts:45
     Hardcoded 1:1 crop for all thumbnails

   ✓ HIGH  Auth on all prod routes
   ✓ LOW   No prompts exposed in UI

   3 of 4 invariants passing.
   ```
5. If `cartograph.json` exists, the agent updates only the `invariants` key (leaves all other data untouched)
6. If `cartograph.json` doesn't exist, the agent creates a minimal JSON with only `meta` and `invariants`

### Flow 4: View in visualizer

1. User opens `visualizer.html` and loads `cartograph.json`
2. If the JSON has an `invariants` key, the Invariants tab appears in the Product Map group
3. The tab shows:
   - Summary bar: total count, passing count, failing count, skipped count
   - Invariant cards sorted by: failing first, then by severity (critical → high → low)
   - Each card shows: name, severity badge, status badge, summary, tags
   - Clicking a card expands it to show: full evidence, checked files, violations with file paths and suggestions, and the verification prompt (with a copy button)
4. If the JSON has no `invariants` key, the tab either doesn't appear or shows a "No invariant data" placeholder

## SKILL.md Changes

### Intent detection

Add an intent detection section at the top of the workflow. Before starting Wave 0, the agent checks the user's message:

- If the message contains "add invariant", "new invariant", or similar phrasing → run the **Add Invariant** flow instead of the full scan
- If the message contains "verify", "check invariants", or similar → run the **Standalone Verify** flow
- Otherwise → run the full scan (which includes invariant verification in Wave 3.5)

### New Agent 11 in Wave 3.5

Add to the Wave 3.5 section:

#### Agent 11 — Invariant Verification

Give this agent the discover bundle and ask it to verify all invariants.

The agent should:
1. Read `cartograph-invariants.md` from the repo root
2. If the file doesn't exist, return `null` (no invariants to verify)
3. Parse each invariant section: extract frontmatter fields and body sections
4. Skip invariants with `enabled: false` — emit a `"skipped"` result for each
5. For each enabled invariant:
   - Follow the **Verification steps** section as a guide
   - Read the files listed in **Known scope** and any additional files the steps reference
   - Evaluate whether the **Pass criteria** hold
   - If passing: record the checked files and an empty violations array
   - If failing: record specific violations with file paths, line numbers, what was expected, what was found, and a suggestion
6. Compute the summary counts (total, passing, failing, skipped)

Return: the `invariants` object matching the JSON schema above.

### Wave 5 assembly update

In the assembly step, add:
- If Agent 11 returned a non-null result, include `"invariants": <agent-11-result>` in the final JSON

## Visualizer Changes

### New tab: Invariants

- **Tab group:** Product Map (blue accent, `#5b8def`)
- **Position:** After Flows, before Entity Map
- **Tab label:** "Invariants" with a count badge showing `failing/total` (e.g., "1/4")

### Tab layout

**Header section:**
- Summary stats: `N invariants · M passing · K failing · J paused`
- Color-coded: passing count in green, failing in red, paused in muted

**Card list:**
- Sorted: failing first (by severity descending), then passing (by severity descending), then skipped
- Each card:
  - **Left column:** Status icon (✓ green / ✗ red / ⏸ muted)
  - **Main content:**
    - Name (heading)
    - Severity badge (critical = red, high = amber, low = muted)
    - Tag badges (muted, small)
    - Summary text
  - **Expanded state** (on click):
    - Full evidence section
    - Checked files list
    - Violations (if any) with file path, line, expected/found/suggestion
    - Verification prompt in a monospace block with copy-to-clipboard button
    - Surface/feature links (if surfaceIds/featureIds are present and match entities in the JSON)

### Overview tab integration

Add an Invariants summary card to the Overview tab:
- Shows the same passing/failing/total counts
- Color-coded bar (like code health scores)
- Links to the Invariants tab

### Graceful degradation

- If `invariants` key is missing from JSON: Invariants tab doesn't appear, no error
- If `invariants.results` is empty: Tab appears with "No invariants defined" message and guidance on how to add one

## Edge Cases & Error Handling

- **Malformed definitions file:** If the agent can't parse `cartograph-invariants.md` (bad frontmatter, missing required fields), it should report which invariant definitions are malformed in the console output and skip them. Include a `"status": "error"` result with a `summary` explaining the parse issue.
- **Duplicate IDs:** If two invariants share the same `id`, the agent warns and skips the duplicate.
- **Missing scope references:** If `surfaceIds` or `featureIds` reference IDs that don't exist in the current `cartograph.json`, the agent ignores the scope hints and verifies based on the assertion text alone. No error.
- **Empty definitions file:** If the file exists but has no invariant sections, verify mode reports "No invariants defined" and the JSON `results` array is empty.
- **Large codebases:** Verification steps should specify focused file paths/patterns. If an invariant's known scope is too broad (e.g., "all files"), the agent should still attempt verification but may note reduced confidence in the summary.
- **Ambiguous assertions:** During the Add Invariant flow, if the user's assertion is too vague for the agent to determine verification steps, the agent should ask a clarifying question before writing the definition.
- **Invariant that fails on first verification:** The definition is still saved. The agent reports the failure and lets the user decide whether to fix the code or adjust the invariant. This is by design — users may want to document an invariant for something they're about to fix.
- **Concurrent modification:** If `cartograph-invariants.md` is modified while a verification is running, the results may be inconsistent. This is acceptable for V1 — verification reads the file once at the start.
- **No previous cartograph.json:** When adding an invariant, the agent can't resolve `surfaceIds`/`featureIds` if no prior scan exists. The agent should omit these scope fields and note in the definition that scope IDs can be added after a full scan.

## Future Considerations

- **Invariant discovery mode:** Agent suggests candidate invariants it notices during a full scan (e.g., "all routes use auth middleware" → would you like to make this an invariant?)
- **History and trend tracking:** Store last N verification results per invariant to enable trend sparklines in the visualizer
- **CI integration via AgentDrop API:** Run invariant verification as part of PR checks
- **Scheduled verification:** Integration with Claude Code automations or cron to run `/cartograph verify` on a schedule
- **Invariant templates:** Pre-built invariant definitions for common patterns (auth guards, credit refunding, rate limiting, input validation)
- **Cross-invariant analysis:** Detect when invariants overlap or contradict each other
