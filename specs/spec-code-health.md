# Code Health Metrics Spec

Extend Cartograph with two persistent code health axes — **Co-location** and **DRYness** — measured during extraction, output in `cartograph.json`, and surfaced as north-star engineering metrics in a first-class **Code Health** visualizer tab.

## Goals

- Give engineers two clear, quantified scores to optimize for: "is code in the right place?" and "is code unnecessarily duplicated?"
- Make every finding actionable — each violation includes a concrete recommendation (move file X, extract shared logic to Y)
- Surface these as the most prominent metrics in the Eng view — they're north-star numbers the team tracks over time
- Design the schema and UI to support additional health metrics in the future without restructuring

## Non-Goals

- Linting or style checking (handled by ESLint)
- Test coverage metrics (may be added later as a third axis)
- Complexity scoring (may be added later)
- Auto-fixing violations (this is measurement + recommendation only)

## Axes

### 1. Co-location

Measures whether files live close to their consumers, per the project's co-location rules.

**Rule source:** Agent reads `AGENTS.md`, `CLAUDE.md`, or equivalent project-level instructions for co-location conventions. If no project-specific rules are found, falls back to universal heuristics:
- Files used by a single surface should live inside that surface's directory
- Files shared by multiple surfaces but representing one capability belong in `features/<capability>/`
- Root `components/`, `lib/`, `actions/` are for truly global code used by 3+ surfaces/features
- UI primitives (`components/ui/*`) are always correctly placed (exempt)

**Detection method:** Agent traces actual imports from every file to determine which surfaces and features consume it. This is ground-truth — not inferred from compartment assignments.

**Scoring:**
- Each non-generated, non-infrastructure file gets a binary **pass/fail** verdict
- Overall score = `(files passing / total files evaluated) * 100`
- Color thresholds: green >= 90%, yellow 70–89%, red < 70%
- Infrastructure files (config, build tooling, type definitions not tied to a feature) are **exempt** — they don't count toward the score

**Finding format:**

```json
{
  "file": "lib/format-date.ts",
  "verdict": "fail",
  "reason": "Used exclusively by app/chat — should be co-located",
  "consumers": ["app/chat/[personaSlug]/components/message-bubble.tsx"],
  "recommendation": {
    "action": "move",
    "target": "app/chat/[personaSlug]/lib/format-date.ts"
  }
}
```

Fields:
- `file` — the misplaced file (relative path)
- `verdict` — `"pass"` or `"fail"`
- `reason` — plain-language explanation of why this file is misplaced
- `consumers` — files that import this file (the evidence)
- `recommendation.action` — `"move"` (to a surface/feature dir) or `"promote"` (to `features/` because it serves multiple surfaces)
- `recommendation.target` — suggested new path

### 2. DRYness

Measures how much duplicated or near-duplicated functionality exists across the codebase.

**Detection method:** Agent reads actual file contents. It weighs two signal types:
1. **Functional overlap** — two code areas that solve the same product problem (e.g., prompt remix in admin vs chat), even if the code looks structurally different
2. **Structural similarity** — code that follows the same patterns (similar component trees, similar hooks, similar API calls), even if serving slightly different purposes

The AI weighs both signals based on context to decide what to flag. It determines the appropriate granularity per finding — file pairs, opportunity clusters, or feature-level patterns.

**Scoring:**
- Count-based: score inversely proportional to number of findings
- Formula: `max(0, 100 - (findingCount * K))` where K is a scaling factor based on codebase size
- Suggested K: `K = 200 / totalNonInfraFiles` — so ~5 findings in a 200-file codebase = 95%, ~20 findings = 80%
- Color thresholds: same as co-location — green >= 90%, yellow 70–89%, red < 70%

**Finding format:**

```json
{
  "id": "prompt-remix-duplication",
  "title": "Prompt remix experience duplicated across surfaces",
  "severity": "high",
  "implementations": [
    {
      "location": "app/chat/[personaSlug]/components/prompt-remix.tsx",
      "description": "Chat-embedded prompt remix modal with conversation context"
    },
    {
      "location": "app/admin/components/remix-panel.tsx",
      "description": "Admin panel for remixing prompts during content review"
    }
  ],
  "sharedLogic": [
    "Prompt transformation state machine",
    "FAL API client for remix generation",
    "Prompt history tracking"
  ],
  "recommendation": {
    "action": "Extract shared logic",
    "target": "features/prompt-remix/",
    "shared": ["remix state machine", "API client", "prompt history hook"],
    "keepSeparate": ["admin UI chrome", "chat modal wrapper", "conversation context injection"]
  }
}
```

Fields:
- `id` — unique kebab-case identifier
- `title` — plain-language description of the duplication
- `severity` — `"high"` (large functional overlap, significant code savings), `"medium"` (partial overlap, moderate savings), `"low"` (minor overlap, small savings)
- `implementations[]` — the duplicated code locations
  - `location` — file or directory path
  - `description` — what this implementation does / how it differs
- `sharedLogic` — list of specific things that are duplicated across implementations
- `recommendation.action` — what to do (e.g., "Extract shared logic", "Consolidate into single implementation", "Abstract common client")
- `recommendation.target` — where the shared code should live
- `recommendation.shared` — what should be extracted/shared
- `recommendation.keepSeparate` — what should remain implementation-specific

## Schema Addition

New top-level `codeHealth` key in `cartograph.json`:

```json
{
  "meta": { "..." : "..." },
  "surfaces": [],
  "features": [],
  "codeHealth": {
    "analyzedAt": "2025-01-15T10:30:00Z",
    "metrics": [
      {
        "id": "co-location",
        "name": "Co-location",
        "description": "Measures whether files live close to their consumers",
        "score": 92,
        "thresholds": { "green": 90, "yellow": 70 },
        "summary": "8 of 103 evaluated files are misplaced",
        "findings": [ "..." ]
      },
      {
        "id": "dryness",
        "name": "DRYness",
        "description": "Measures duplicated or near-duplicated functionality",
        "score": 78,
        "thresholds": { "green": 90, "yellow": 70 },
        "scalingFactor": 0.97,
        "summary": "3 duplication clusters found across 7 files",
        "findings": [ "..." ]
      }
    ]
  }
}
```

The `metrics[]` array is **pluggable** — future metrics (test coverage, complexity, type safety) can be added as new entries without restructuring. Each metric has a consistent envelope: `id`, `name`, `description`, `score`, `thresholds`, `summary`, and metric-specific `findings[]`.

The co-location `findings[]` array uses the co-location finding format above. The DRYness `findings[]` array uses the DRYness finding format above. Each metric type defines its own finding schema — the visualizer dispatches on `metric.id` to render the appropriate UI.

## Workflow Integration

New **Wave 3.5** between existing Wave 3 (Flows + Compartments + Feature Map) and Wave 4 (Compartment Dependencies). Two agents run in parallel:

### Agent 8 — Co-location Analysis

**Inputs:** discover bundle (full file inventory), surfaces, features, compartments, and project co-location rules (from AGENTS.md/CLAUDE.md).

The agent should:
1. Read the project's AGENTS.md/CLAUDE.md for co-location conventions. If not found, use universal fallback heuristics
2. For each non-generated, non-infrastructure file in the codebase:
   a. Trace its imports to determine which surfaces and features consume it
   b. Determine where the file currently lives vs. where it should live per the rules
   c. Assign a pass/fail verdict
3. For each failing file, generate a recommendation (move to surface dir, promote to features/, etc.)
4. Compute the overall score: `(passing files / total evaluated files) * 100`

**Output:** A co-location metric object with `score`, `summary`, and `findings[]`.

### Agent 9 — DRYness Analysis

**Inputs:** discover bundle (full file inventory), surfaces, features, entities, operations, compartments.

The agent should:
1. Use features and compartments as a starting map of the codebase's functional areas
2. For each feature, scan for similar implementations across different surfaces:
   - Look for features with overlapping `entityIds` or similar `implementations`
   - Look for compartments with similar `tags` and overlapping file patterns
3. Read file contents for candidate duplications to confirm and detail them
4. For each confirmed finding, determine:
   - What logic is shared vs. what's implementation-specific
   - Where shared logic should live (following the project's co-location rules)
   - What the consolidation strategy should be
5. Compute the overall score: `max(0, 100 - (findingCount * K))` where `K = 200 / totalNonInfraFiles`

**Heuristics for finding candidates** (before reading file contents):
- Two features with the same `kind` and overlapping `entityIds` across different surfaces
- Files in different surfaces with similar names or import patterns
- Compartments with similar descriptions or overlapping `featureIds`
- Server actions or hooks that wrap the same external API (e.g., two different FAL clients)

**Output:** A DRYness metric object with `score`, `scalingFactor`, `summary`, and `findings[]`.

### Assembly (Wave 5 update)

In the final assembly step, merge both agents' outputs into the `codeHealth` key:
```
codeHealth.analyzedAt = ISO timestamp
codeHealth.metrics = [colocationMetric, drynessMetric]
```

## Visualizer: Code Health Tab

Code health is now surfaced in its own Eng tab:

```
Overview  ·  PM  Surfaces | Features | Flows  ·  ENG  Feature Map | Data Model | Code Organization | Code Health
```

The Code Health tab hides the global sidebar and renders its own internal metric-and-findings sidebar beside a full-width content area.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [metric sidebar]               │ [content area]             │
│ 🟢 Co-location  92%            │ Co-location                │
│ 🟡 DRYness      78%            │ Score: 92%                 │
│--------------------------------│ Thresholds / summary       │
│ Findings (8)                   │ or selected finding detail │
│ lib/format-date.ts             │ with cross-tab navigation  │
│ lib/remix-utils.ts             │ to Code Organization and   │
│ ...                            │ Feature Map                │
└─────────────────────────────────────────────────────────────┘
```

### Tab behavior

- **Internal sidebar:** ~300px, fixed. Contains the metric scoreboard plus the findings list for the selected metric.
- **Metric overview:** When no finding is selected, the content area shows metric name, score, description, summary, and threshold breakdown.
- **Finding detail:** Clicking a finding expands its full detail in the content area.
  - Co-location shows file path, reason, consumers, and recommendation.
  - DRYness shows title, severity, implementations, shared logic, and recommendation.
- **Cross-tab navigation:** Finding detail includes buttons to jump to Code Organization and Feature Map while preserving the active finding highlight.
- **Overview integration:** The PM Overview tab shows a compact Code Health strip that links into this tab with the chosen metric pre-selected.

### Extensibility

The Code Health tab renders metrics dynamically from `codeHealth.metrics[]`. Adding a future metric (e.g., test coverage) means:
1. Add a new agent in Wave 3.5
2. Add a new metric entry to `codeHealth.metrics[]` with its own `findings[]` schema
3. The tab automatically picks it up — new score card in the sidebar, new finding list, and new detail rendering keyed by `metric.id`

## Edge Cases

- **No AGENTS.md/CLAUDE.md found:** Co-location agent uses universal heuristics only. Adds a note in `summary`: "No project-specific co-location rules found — using universal heuristics."
- **No DRYness findings:** Score = 100%. Code Health shows a "No duplication found" message.
- **All files pass co-location:** Score = 100%. Code Health shows an "All files correctly co-located" message.
- **Very large codebases:** DRYness agent should cap file content reads at representative samples (first 200 lines) for very large files. Co-location import tracing should use the existing file inventory rather than re-scanning.
- **Generated/vendored files:** Excluded from both metrics (same exclusion rules as compartments: `generated/`, `node_modules/`, `.next/`, `dist/`).
- **`codeHealth` key missing:** The Overview tab hides the Code Health strip, and the Code Health tab shows a "No code health data" message. All other tabs work normally.

## Resolved Decisions

- **Co-location findings:** Simple list sorted by file path. No filtering or sorting UI for V1.
- **DRYness scoring:** Flat count — each finding deducts equally regardless of severity. Simple to reason about.
- **Code Health discoverability:** Yes — it is a first-class Eng tab, not a hidden sidebar.
