# Code Organization — Cartograph Extension Spec

## Overview

A new "Code Organization" tab in the Cartograph visualizer that groups the entire codebase into AI-extracted, nestable **compartments** of related code. Compartments bridge the product-side view (Surfaces, Features, Data Model, Flows) with the underlying code structure, so a developer can navigate from "what does this feature do?" to "where does that code live and what else is nearby?"

The target user is a new engineer (or an AI agent) who already understands the product via the existing Cartograph tabs and now wants to drill into the code itself — examining health, finding shared code, and understanding coupling.

## Goals

- Group every file in the repo into one or more logical compartments that reflect how the code is actually organized and related.
- Make compartments nestable (unlimited depth, AI-determined) to capture hierarchical structure (e.g., "Content Generation" → "Image Generation" → "FAL Integration").
- Bridge product ↔ code: Features and Surfaces reference compartments instead of raw file lists. Compartments link back to the Features and Surfaces they serve.
- Track inter-compartment dependencies so developers can see coupling and understand how code areas relate.
- Visualize compartments as an interactive expandable tree with a detail panel and an optional dependency graph view.

## Non-Goals

- **Not a linter or code quality tool** — no eslint-style issue detection, no "fix this" suggestions.
- **Not a dependency graph of individual files** — compartments group files; the dependency graph is between compartments, not files.
- **Not a replacement for the existing tabs** — Code Organization complements Surfaces, Features, Data Model, Feature Map, Code Health, and Flows; it doesn't replace them.
- **No runtime analysis** — compartments are determined from static analysis (file paths, imports, types, domain proximity), not from runtime behavior.

## Core Concept: Compartments

A **compartment** is a logical grouping of related files that form a cohesive unit of functionality. Compartments are:

- **AI-extracted** — determined during the cartograph scan using the AI's judgment based on multiple signals: co-location (folder structure), import relationships, shared types/entities, domain relevance, naming conventions, and functional purpose.
- **Nestable** — compartments can contain sub-compartments to unlimited depth. The AI decides how deep to nest based on the codebase's complexity. A typical web app might have 2–3 levels; a large monorepo might have more.
- **Non-exclusive** — a file can appear in multiple compartments. For example, `lib/prisma.ts` might appear in both a "Database" compartment and a "Shared Infrastructure" compartment.
- **Exhaustive** — every file in the repo should belong to at least one compartment. Config files, build tooling, and other infrastructure files go into a "Project Infrastructure" compartment (or sub-compartments thereof).

### What makes a good compartment

A compartment should answer: "If I want to understand or modify _[this area of functionality]_, which files do I need to look at?" Examples:

- "Authentication & Auth Gates" — Clerk config, middleware, auth utility functions, the age-gate component, auth-related server actions.
- "Image Generation Pipeline" — FAL client, image generation server actions, prompt assembly logic, NSFW classifier, creation polling hooks.
- "Admin Content Studio" — the `/admin/content` page, its components, hooks, server actions, related API routes.
- "UI Primitives" — everything in `components/ui/`.
- "Project Infrastructure" — `next.config.ts`, `tailwind.config.ts`, `package.json`, `tsconfig.json`, Prisma config, etc.

## Data Model

### New: `compartments[]` array in cartograph.json

```jsonc
{
  // ... existing meta, surfaces, features, entities, relationships, operations, flows ...

  "compartments": [
    {
      "id": "compartment-id",          // kebab-case unique identifier
      "name": "Image Generation",      // human-readable name
      "description": "Server actions, FAL client integration, and prompt assembly for generating images via the wizard and content studio.",
      "parentId": "content-generation", // nullable — ID of parent compartment (null for top-level)
      "tags": ["business-logic", "api-integration"],  // semi-structured tags
      "files": [
        { "file": "app/chat/[personaSlug]/actions/generate-image.ts", "role": "action" },
        { "file": "lib/fal-client.ts", "role": "lib" },
        { "file": "lib/prompt-assembly.ts", "role": "lib" }
      ],
      "featureIds": ["image-generation", "prompt-wizard"],   // linked features
      "surfaceIds": ["chat-thread", "admin-content-studio"],  // linked surfaces
      "dependsOn": ["media-delivery", "database-access"],     // IDs of other compartments this one imports from
      "confidence": "high"
    }
  ]
}
```

### Field definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique kebab-case identifier |
| `name` | string | yes | Human-readable compartment name |
| `description` | string | yes | 1–2 sentence explanation of what this code area does |
| `parentId` | string \| null | yes | ID of parent compartment, or null for top-level |
| `tags` | string[] | yes | Semi-structured tags (see Tag Vocabulary below) |
| `files` | array | yes | Files in this compartment with their roles |
| `files[].file` | string | yes | Relative path from repo root |
| `files[].role` | string | yes | One of: "component", "hook", "action", "api", "lib", "type", "config", "style", "test", "other" (same as feature file roles) |
| `featureIds` | string[] | yes | IDs of features this compartment implements (can be empty) |
| `surfaceIds` | string[] | yes | IDs of surfaces this compartment serves (can be empty) |
| `dependsOn` | string[] | yes | IDs of other compartments this one depends on (imports from) |
| `confidence` | string | yes | "high" \| "medium" \| "low" |

### Tag Vocabulary (semi-structured)

Suggested core tags — the AI should use these when applicable and may create additional custom tags as needed:

- `ui` — visual components, layouts, styling
- `data-access` — database queries, Prisma operations, data fetching
- `business-logic` — domain rules, calculations, validation
- `api` — API routes, server actions, external service integrations
- `api-integration` — third-party service clients (FAL, Clerk, Stripe, etc.)
- `infrastructure` — config, build tooling, dev tooling, CI/CD
- `shared` — utilities used across many compartments
- `state-management` — stores, context providers, state hooks
- `auth` — authentication and authorization
- `testing` — test files, test utilities, fixtures

## Changes to Existing Data Model

### Features: replace `files[]` with `compartmentIds[]`

Currently, features have a `files` array that lists individual files. This is replaced with compartment references:

**Before:**
```json
{
  "id": "image-generation",
  "files": [
    { "file": "lib/fal-client.ts", "role": "lib" },
    { "file": "app/chat/[personaSlug]/actions/generate-image.ts", "role": "action" }
  ]
}
```

**After:**
```json
{
  "id": "image-generation",
  "compartmentIds": ["image-generation-pipeline", "media-delivery"],
  "files": []  // kept for backwards compatibility but no longer populated
}
```

The `compartmentIds` field is a new addition. The existing `files` field remains in the schema (empty array) for backwards compatibility with any tooling that reads the old format, but it is no longer populated during scan.

### Surfaces: add `compartmentIds[]`

Surfaces gain a new `compartmentIds` field linking to related compartments:

```json
{
  "id": "chat-thread",
  "compartmentIds": ["chat-system", "image-generation-pipeline", "prompt-wizard-ui"]
}
```

This is additive — no existing surface fields are removed.

## Extraction Process

### New phases added to the cartograph scan workflow

The existing 8-phase workflow gains two new phases. These run **after** features are extracted (since compartments reference features):

**Phase 9: Extract Compartments**

The AI scans the full codebase file tree and, using the already-extracted surfaces, features, entities, and operations as context, groups files into compartments. The AI considers:

1. **Folder structure** — files in the same directory or subtree often belong together.
2. **Import graph** — files that heavily import each other are likely in the same compartment.
3. **Feature alignment** — files already identified as belonging to a feature should cluster into compartments that map to those features.
4. **Domain proximity** — files dealing with the same entity or business concept belong together.
5. **Naming conventions** — files with related names (e.g., `image-*.ts`, `*-generation.*`) suggest a compartment.
6. **Shared infrastructure** — truly shared files (used by 3+ features) may warrant their own compartment or may appear in multiple compartments.

The AI outputs the full `compartments[]` array with nesting, files, tags, and feature/surface links.

**Phase 10: Map Compartment Dependencies**

For each compartment, the AI examines the import statements of its files to determine which other compartments it depends on. This produces the `dependsOn` field for each compartment.

The AI also populates `compartmentIds` on features and surfaces during this phase.

### Guidance for the AI extractor

- **Every file must appear in at least one compartment.** If a file doesn't clearly belong anywhere, assign it to the nearest logical parent or to "Project Infrastructure."
- **Prefer meaningful groupings over 1:1 folder mapping.** If a folder contains unrelated files, split them. If related files span folders, group them.
- **Don't create compartments with only 1 file** unless it's a genuinely standalone module. Merge small groupings into their parent.
- **Keep top-level compartments to 8–15** for a typical web app. More sub-compartments are fine.
- **Name compartments after what they do**, not after folder names. "Image Generation Pipeline" is better than "app/chat/actions."

## Visualizer Changes

### New Tab: "Code Organization"

The Code Organization tab appears in the Eng group after Data Model in the tab bar. It has two views, toggled by a button in the tab header:

#### Tree View (default)

**Sidebar (left panel):**
- Search input that filters compartments by name, description, and tags.
- Expandable tree of compartments. Top-level compartments are shown as root nodes; sub-compartments are nested underneath with expand/collapse toggles.
- Each node shows: compartment name, file count badge, and tag pills.
- Clicking a compartment selects it and populates the detail panel.

**Detail panel (right panel):**

When a compartment is selected, the detail panel shows:

1. **Header**: Compartment name, description, tags as pills.
2. **Files**: List of files grouped by role (component, hook, action, api, lib, type, config, style, test, other). Each file is a clickable path. Show file count per role group.
3. **Sub-compartments**: If the selected compartment has children, list them with clickable links that navigate within the tree.
4. **Linked Features**: List of features this compartment implements (from `featureIds`). Clicking navigates to the Features tab and selects that feature.
5. **Linked Surfaces**: List of surfaces this compartment serves (from `surfaceIds`). Clicking navigates to the Surfaces tab and selects that surface.
6. **Dependencies**: Two sections:
   - "Depends on" — compartments this one imports from (from `dependsOn`). Clickable to navigate within Code Organization.
   - "Used by" — compartments that list this one in their `dependsOn` (computed from the inverse). Clickable.
7. **"Copy as LLM context" button**: Generates a markdown block containing: compartment name, description, all file paths with roles, linked feature names, linked surface names, and dependency names.

#### Dependency Graph View (toggle)

A toggle button labeled "Show dependency graph" / "Show tree view" switches between the tree and a graph visualization:

- Compartments as nodes (only top-level compartments, or all compartments — collapsible by depth).
- Directed edges showing `dependsOn` relationships.
- Similar interaction model to the existing Data Model graph: pan, zoom, click node to see details.
- Node size or color can reflect file count or tag category.

### Modified Tab: Features

In the feature detail panel, the **"File map"** section is replaced with a **"Compartments"** section:

- Lists compartment names (from the feature's `compartmentIds` looked up against the compartments array).
- Each compartment name is clickable — navigates to the Code Organization tab and selects that compartment.
- The "Regenerate file map" prompt and related UI are removed since compartments replace per-feature file maps.

If `compartmentIds` is empty (e.g., old cartograph.json without compartments), fall back to showing the existing `files` array for backwards compatibility.

### Modified Tab: Surfaces

In the surface detail panel, add a new **"Compartments"** section (below entities, above operations):

- Lists compartment names from the surface's `compartmentIds`.
- Each is clickable — navigates to Code Organization tab.

### Header Stats

Add a "compartments" count to the header stats bar (alongside the existing surfaces, features, entities, relationships, operations, flows counts).

## LLM Context Generation

The "Copy as LLM context" button on a compartment generates markdown in this format:

```markdown
## Compartment: [Name]

> Generated by the **Cartograph** skill (`.agents/skills/cartograph/`), from `cartograph.json`. See `cartograph.json` for the full codebase map — surfaces, features, entities, relationships, operations, flows, and compartments.

**Description:** [description]
**Tags:** [tag1, tag2, ...]

### Files
**Components:**
- path/to/component-a.tsx
- path/to/component-b.tsx

**Actions:**
- path/to/action.ts

**Lib:**
- path/to/util.ts

[... grouped by role ...]

### Linked Features
- [Feature Name 1]
- [Feature Name 2]

### Linked Surfaces
- [Surface Name 1]

### Dependencies
**Depends on:** [Compartment A], [Compartment B]
**Used by:** [Compartment C]
```

## Edge Cases

- **Empty repos / very small codebases**: If the repo has fewer than ~10 files, a single flat list of compartments (no nesting) is fine. Don't force hierarchical structure.
- **Monorepos**: Each package/app in a monorepo should be its own top-level compartment with sub-compartments within.
- **Generated files**: Files in `generated/`, `node_modules/`, `.next/`, `dist/` should be excluded from compartments entirely (same as they're excluded from the rest of cartograph).
- **Test files**: Test files should be placed in the same compartment as the code they test, with role "test".
- **Files in multiple compartments**: This is expected and fine. A shared utility like `lib/prisma.ts` might appear in "Database Access" and also in "Shared Infrastructure". The visualizer should not deduplicate — each compartment shows its full file list independently.
- **Backwards compatibility**: If `compartments` is missing from cartograph.json (old scan), the Code Organization tab shows a message like "No compartment data. Re-run cartograph to generate." Features fall back to showing `files[]` if `compartmentIds` is absent.

## JSON Schema Addition

Add to the existing `json-schema.md`:

```
### `compartments[]`

| field | type | required | notes |
|-------|------|----------|-------|
| id | string | yes | kebab-case unique identifier |
| name | string | yes | human-readable compartment name |
| description | string | yes | 1–2 sentence explanation |
| parentId | string \| null | yes | ID of parent compartment, null for top-level |
| tags | string[] | yes | semi-structured tags (see suggested vocabulary) |
| files | {file: string, role: string}[] | yes | files with roles (same role enum as features) |
| featureIds | string[] | yes | linked feature IDs |
| surfaceIds | string[] | yes | linked surface IDs |
| dependsOn | string[] | yes | IDs of compartments this one imports from |
| confidence | "high" \| "medium" \| "low" | yes | extraction confidence |
```

Add `compartmentIds: string[]` to both `surfaces[]` and `features[]` schemas.

Remove `files[]` population guidance from `features[]` (keep field for backwards compat, document as deprecated).

## Success Criteria

1. Running cartograph produces a `compartments[]` array that covers 100% of non-generated files in the repo.
2. The Code Organization tab renders an interactive, expandable tree with working search, detail panel, and dependency links.
3. Clicking a compartment in the Features or Surfaces tab navigates to Code Organization and selects it.
4. Clicking a feature or surface link in a compartment's detail panel navigates to the correct tab.
5. The dependency graph toggle shows a navigable graph of compartment relationships.
6. "Copy as LLM context" produces usable markdown that an AI agent can act on.
7. Backwards compatibility: visualizer works with old cartograph.json files that lack compartments (tabs degrade gracefully).

## Future Considerations (explicitly deferred)

- **Code health metrics** per compartment (test coverage, complexity scores, staleness).
- **Change impact analysis** — "if I modify this compartment, what other compartments might break?"
- **Diff view** — compare compartment structure between two cartograph scans to see how the codebase evolved.
- **Manual overrides** — let developers pin files to specific compartments or rename compartments.
