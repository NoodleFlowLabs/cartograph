# Feature Map — Cartograph Extension Spec

## Overview

A new "Feature Map" tab in the Cartograph visualizer that displays the project's file structure as a traditional expandable tree, with a horizontal feature-composition bar under each file and folder name. The bar shows an AI-estimated breakdown of what percentage of each file is attributable to each feature, using colored segments. Folders aggregate recursively from their descendants.

This feature is **fully isolated** from the existing cartograph data model. It adds a new `fileTree` top-level key to `cartograph.json` and a new tab to the visualizer. No existing surfaces, features, entities, compartments, or other data structures are modified. If removed later, deleting the `fileTree` key and the tab code is sufficient.

## Goals

- Show the project's file structure with per-file and per-folder feature composition at a glance.
- Let developers quickly see "this folder is 60% auth code and 40% UI" or "this file is entirely part of the payment system."
- Use color-coded horizontal bars as a compact, scannable visualization.
- Keep the feature completely isolated from existing cartograph data so it can be removed without side effects.

## Non-Goals

- Not replacing the Code Organization tab or compartment system — this is a complementary view.
- Not a code quality or complexity metric — it only shows feature attribution.
- Not showing every file in the repo — generated files (`node_modules/`, `.next/`, `generated/`, `dist/`) are excluded.

## Data Model

### New: `fileTree[]` array in cartograph.json

A flat array of entries, one per non-generated file tracked by cartograph. Each entry contains AI-estimated feature weights.

```json
{
  "fileTree": [
    {
      "file": "app/chat/[personaSlug]/components/wizard-modal/index.tsx",
      "featureWeights": [
        { "featureId": "prompt-wizard", "weight": 0.7 },
        { "featureId": "image-generation", "weight": 0.3 }
      ]
    },
    {
      "file": "lib/prisma.ts",
      "featureWeights": [
        { "featureId": "__infrastructure__", "weight": 1.0 }
      ]
    },
    {
      "file": "next.config.ts",
      "featureWeights": [
        { "featureId": "__infrastructure__", "weight": 1.0 }
      ]
    }
  ]
}
```

### Field definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | yes | Relative path from repo root |
| `featureWeights` | array | yes | AI-estimated feature breakdown for this file |
| `featureWeights[].featureId` | string | yes | References a feature id from `features[]`, or the special value `"__infrastructure__"` |
| `featureWeights[].weight` | number | yes | Estimated proportion (0.0–1.0). All weights for a file must sum to 1.0 |

### The `__infrastructure__` pseudo-feature

Files that don't meaningfully belong to any product feature (config files, build tooling, shared infrastructure, type definitions, etc.) are assigned `featureId: "__infrastructure__"` with weight 1.0 (or a partial weight if the file also serves a real feature). This ensures every file has a complete weight breakdown that sums to 1.0.

In the visualizer, `__infrastructure__` is rendered with a neutral gray color and appears in the legend as "Infrastructure."

### No changes to existing data

The `fileTree` key is additive. No existing keys (`surfaces`, `features`, `entities`, `relationships`, `operations`, `flows`, `compartments`) are modified. The feature weights are the AI's independent estimate of each file's purpose — they don't need to be consistent with compartment-to-feature mappings.

## Extraction Process

### New agent in Wave 3: Agent 7 — File Tree Feature Weights

This agent runs in **Wave 3** alongside the existing Flows (Agent 5) and Compartments (Agent 6) agents. It receives:

- The **discover bundle** (full file inventory from Wave 0)
- The **features** array from Wave 2

The agent should:

1. Take the list of all non-generated files from the discover bundle.
2. For each file, read the file contents (or a representative sample for very large files) and use the features list as context to estimate what percentage of the file's purpose is attributable to each feature.
3. Files that don't belong to any product feature get `__infrastructure__` as their sole feature.
4. Files that serve multiple features get proportional weights (e.g., a shared hook used by two features might be 50/50).
5. All weights for a file must sum to 1.0.
6. Return: a JSON array of `{file, featureWeights}` entries.

**Estimation guidance for the AI:**

- Look at imports, function names, component names, and the overall purpose of the file.
- A file that is 100% dedicated to one feature's UI component → `[{featureId: "that-feature", weight: 1.0}]`.
- A shared utility used by feature A's server action and feature B's hook → split proportionally based on how much of the file serves each.
- Config files, type definitions with no feature-specific logic, build config, middleware → `__infrastructure__`.
- When in doubt, prefer fewer features per file with higher weights over many features with tiny weights.

## Visualizer: Feature Map Tab

### Tab placement

The "Feature Map" tab appears first in the Eng group, after the PM tabs. Add a tracked-files count to the header stats bar.

### Layout

The tab has two panels:

**Left panel — File tree:**
- A traditional expandable/collapsible file tree, like a file explorer in an IDE.
- Only shows non-generated files tracked by cartograph.
- Each node shows:
  - File/folder icon and name on one line.
  - A thin horizontal bar on the line below, showing the feature composition as colored segments.
- Folders are expandable/collapsible. When collapsed, the bar still shows the recursive aggregate of all descendants.

**Right panel — Legend:**
- A sticky, collapsible legend panel showing all features with their assigned colors.
- `__infrastructure__` appears as "Infrastructure" with a neutral gray color.
- Clicking a feature in the legend highlights all segments of that color across the tree (subtle pulse or border effect).
- The legend also shows the feature kind (tool, interaction, transaction, etc.) as a small label.

### Feature bars

- **Position:** Below the file/folder name, indented to align with the name.
- **Height:** Thin (4–6px), with a small gap between the name and the bar.
- **Segments:** Colored segments proportional to the feature weights. For files, this comes directly from `featureWeights`. For folders, this is the recursive aggregate of all descendant files (by file count — each file contributes equally regardless of size).
- **Top N:** For any given bar, show the top 5–6 features by weight. Group the rest into a single "Other" segment (rendered in a neutral hatched or stippled pattern to distinguish from Infrastructure gray).
- **Hover:** Hovering a segment shows a tooltip with the feature name, percentage, and feature kind.
- **Click:** Clicking a segment navigates to that feature in the Features tab.

### Folder aggregation

Folder bars aggregate recursively across all descendant files:

1. Collect all files within the folder (recursively, including all nested subdirectories).
2. For each feature, sum the weights across all files.
3. Normalize so the total sums to 1.0.

This means a folder's bar always reflects everything inside it, regardless of whether sub-folders are expanded or collapsed.

### Color assignment

Features are assigned colors from a curated palette of 20 maximally distinct colors (high contrast, colorblind-friendly where possible). Assignment is deterministic:

1. Sort all features alphabetically by ID.
2. Assign colors by cycling through the palette in order.
3. `__infrastructure__` always gets neutral gray (#9CA3AF), outside the palette cycle.
4. "Other" (grouped small features) gets a hatched/stippled pattern using a secondary gray.

The same feature always gets the same color across runs (as long as the feature list doesn't change).

### Search

A search input at the top of the file tree panel that filters the tree to show only files/folders matching the query (by file path). Ancestor folders of matching files remain visible (expanded) to maintain tree structure.

### "Copy as LLM context" button

A button at the top of the tab that generates a markdown summary of the visible tree (or selected subtree) with feature breakdowns:

```markdown
## Feature Map: [folder or root name]

> Generated by the **Cartograph** skill (`.agents/skills/cartograph/`).

### app/chat/
- `[personaSlug]/components/wizard-modal/index.tsx` — Prompt Wizard 70%, Image Generation 30%
- `[personaSlug]/actions/generate-image.ts` — Image Generation 85%, Prompt Wizard 15%
- `[personaSlug]/page.tsx` — Chat System 60%, Prompt Wizard 25%, Infrastructure 15%

### lib/
- `prisma.ts` — Infrastructure 100%
- `fal-client.ts` — Image Generation 100%
```

## Edge Cases

- **Empty fileTree:** If the `fileTree` key is missing from `cartograph.json` (old scan or feature removed), the Feature Map tab shows: "No file tree data. Re-run cartograph to generate."
- **Feature renamed between scans:** Colors may shift since assignment is alphabetical. This is acceptable for an experimental feature.
- **Very large repos (1000+ files):** The tree should virtualize rendering (only render visible nodes). The AI estimation agent may need to batch files or sample rather than reading every file in full.
- **Files with all-infrastructure weights:** These appear in the tree with a full gray bar. They're not hidden.
- **Files not in the fileTree array:** If a file exists in compartments but not in `fileTree` (shouldn't happen if the agent runs correctly, but for robustness), show it in the tree with no bar and a "No data" tooltip.

## Backwards Compatibility

- The `fileTree` key is optional. All existing visualizer tabs work without it.
- No existing JSON keys are modified.
- The Feature Map tab degrades gracefully when data is missing.

## Success Criteria

1. Running cartograph produces a `fileTree[]` array covering all non-generated files.
2. Every file's `featureWeights` sums to 1.0.
3. The Feature Map tab renders an expandable tree with colored feature bars under each node.
4. Folder bars correctly aggregate from all recursive descendants.
5. Hovering a segment shows feature name + percentage; clicking navigates to the Features tab.
6. The color legend is visible and interactive (clicking highlights segments).
7. The feature is fully removable by deleting the `fileTree` key from the JSON and the tab code from the visualizer.
