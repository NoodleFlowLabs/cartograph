# Dead Code Metric Spec

Extend Cartograph's code health suite with a third metric — **Dead Code** — that detects unreachable, orphaned, and unused code at both the product level (surfaces, features, entities) and the code level (files). Runs as a new agent in Wave 3.5 alongside co-location and DRYness.

## Goals

- Quantify how much of the codebase is actually alive — reachable from entry points, linked from navigation, referenced by operations
- Detect dead code at two levels: product-level (orphaned surfaces/features/entities that the product no longer uses) and code-level (files nothing imports)
- Flag "test-only" files (imported exclusively by tests) as informational findings without penalizing the score
- Make every finding actionable with a concrete recommendation (`remove` or `review`)

## Non-Goals

- Symbol-level analysis (dead exports, unused variables within live files) — too granular, high false positive rate
- Individual field-level entity analysis (unused columns) — noisy and expensive; only whole models are evaluated
- Transitive reachability analysis (tracing full import graph from roots) — zero direct importers is sufficient and cheaper
- Auto-removal of dead code (measurement + recommendation only, same as other health metrics)

## Detection Layers

The agent evaluates five categories of dead code, each with its own detection method and severity:

### 1. Dead Files (severity: high)

A non-entry-point, non-generated file that has **zero importers** anywhere in the codebase.

**Detection:**
1. Build an import map: for every file in the codebase, record which other files import it
2. Identify entry points that are inherently "live" (never flagged as dead):
   - Pages: `app/**/page.tsx`, `app/**/page.ts`
   - Layouts: `app/**/layout.tsx`, `app/**/layout.ts`
   - API routes: `app/api/**/*.ts`, `app/api/**/*.js`
   - Server actions: files containing `"use server"` directive
   - Config files: `*.config.*`, `next.config.*`, `tailwind.config.*`, `postcss.config.*`, `tsconfig.*`, `package.json`, `.env*`, `middleware.ts`
   - Root entry files: `app/globals.css`, `app/manifest.ts`, etc.
3. For every non-entry-point, non-generated file: if zero other files import it, it's dead

**Scoring:** Counts as 1 dead item toward the score.

**Recommendation:** `"remove"` — "Delete this file — nothing imports it and it is not an entry point."

### 2. Test-Only Files (severity: low)

A non-entry-point, non-test file that is imported **exclusively by test files** (`__tests__/**`, `*.test.*`, `*.spec.*`).

**Detection:**
1. From the import map, find files where every importer is a test file
2. Exclude files that are themselves test files or test utilities living inside `__tests__/`

**Scoring:** Does **not** count as dead for scoring purposes. These are informational findings only — the file is technically alive (tests use it), but production code doesn't.

**Recommendation:** `"review"` — "This file is only imported by test files. Verify it's still needed in production, or move it into the test directory."

### 3. Orphaned Surfaces (severity: high)

A surface (route/page) that has **no inbound navigation links** anywhere in the codebase — it can only be reached by typing the URL directly.

**Detection:**
1. Take the surfaces array from Wave 1
2. For each surface, search the codebase for navigation references to its route:
   - `<Link href="...">` or `<a href="...">` containing the route
   - `router.push(...)` or `router.replace(...)` with the route
   - `redirect(...)` calls with the route
   - Navigation config arrays/objects that include the route (e.g., sidebar items, tab bars, nav menus)
3. A surface with zero inbound navigation references is orphaned
4. **Exemptions:** The root route (`/`), auth callback routes, and webhook/API-only routes are exempt

**Scoring:** Counts as 1 dead item toward the score.

**Recommendation:** `"remove"` — "This surface has no navigation links pointing to it. Remove the route or add navigation to make it discoverable."

### 4. Orphaned Features (severity: medium)

A feature that is not embedded in any live surface, or whose `surfaceIds` all point to orphaned surfaces.

**Detection:**
1. Take the features array from Wave 2 and the orphaned surfaces from detection layer 3
2. A feature is orphaned if:
   - Its `surfaceIds` array is empty, OR
   - Every surface in its `surfaceIds` is itself orphaned
3. Additionally, check if the feature's `implementations` files are all dead files (from detection layer 1) — this is a secondary signal

**Scoring:** Counts as 1 dead item toward the score.

**Recommendation:** `"review"` — "This feature is not embedded in any live surface. Verify whether it's still needed or if its surface references are stale."

### 5. Dead Entities (severity: high)

A whole Prisma model or TypeScript type/interface that **no operation reads or writes**, and that is not referenced by any live feature.

**Detection:**
1. Take the entities array from Wave 1 and the operations array from Wave 2
2. For each entity, check:
   - Does any operation in `operations[]` reference this entity via `entityId`?
   - Does any feature in `features[]` reference this entity via `entityIds`?
   - Is the entity referenced in any Prisma query in the codebase (grep for `prisma.<modelName>.*`)?
3. An entity with zero references across operations, features, and Prisma queries is dead
4. **Exemptions:** Enums are exempt (they may be used in type-only contexts that are hard to trace). Only evaluate `db-model` and `dto` kind entities.

**Scoring:** Counts as 1 dead item toward the score.

**Recommendation:** `"remove"` — "This entity has no operations, features, or queries referencing it. Consider removing the model and running a migration."

## Scoring

Percentage of live items across all evaluated categories:

```
total_evaluated = files_evaluated + surfaces_evaluated + features_evaluated + entities_evaluated
dead_items = dead_files + orphaned_surfaces + orphaned_features + dead_entities
score = ((total_evaluated - dead_items) / total_evaluated) * 100
```

- Test-only files are **excluded from both numerator and denominator** of the dead count — they produce findings but don't affect the score
- Color thresholds: green >= 90%, yellow 70–89%, red < 70%

## Finding Format

All dead code findings use the same shape, discriminated by `kind`:

```json
{
  "id": "dead-file-lib-old-utils",
  "kind": "dead-file",
  "severity": "high",
  "target": "lib/old-utils.ts",
  "reason": "No file in the codebase imports this file",
  "evidence": {
    "importers": []
  },
  "recommendation": {
    "action": "remove",
    "detail": "Delete this file — nothing imports it and it is not an entry point"
  }
}
```

### Finding fields

- `id` — unique kebab-case identifier (e.g., `dead-file-lib-old-utils`, `orphaned-surface-settings`, `dead-entity-legacy-post`)
- `kind` — one of: `"dead-file"`, `"test-only-file"`, `"orphaned-surface"`, `"orphaned-feature"`, `"dead-entity"`
- `severity` — `"high"`, `"medium"`, or `"low"`
- `target` — the dead item (file path, surface id, feature id, or entity id)
- `reason` — plain-language explanation of why this item is dead
- `evidence` — kind-specific evidence object (see below)
- `recommendation.action` — `"remove"` (high confidence) or `"review"` (medium/low confidence)
- `recommendation.detail` — plain-language recommendation

### Evidence by kind

**`dead-file`:**
```json
{
  "importers": []
}
```

**`test-only-file`:**
```json
{
  "importers": ["__tests__/utils.test.ts", "__tests__/helpers.test.ts"]
}
```

**`orphaned-surface`:**
```json
{
  "route": "/settings/legacy",
  "navigationReferences": []
}
```

**`orphaned-feature`:**
```json
{
  "surfaceIds": ["legacy-settings"],
  "allSurfacesOrphaned": true,
  "implementationFiles": ["app/settings/legacy/components/feature-x.tsx"],
  "allImplementationsDead": true
}
```

**`dead-entity`:**
```json
{
  "entityKind": "db-model",
  "referencingOperations": [],
  "referencingFeatures": [],
  "prismaQueryCount": 0
}
```

## Schema Addition

New metric entry in `codeHealth.metrics[]`:

```json
{
  "id": "dead-code",
  "name": "Dead Code",
  "description": "Measures how much of the codebase is unreachable, orphaned, or unused",
  "score": 95,
  "thresholds": { "green": 90, "yellow": 70 },
  "summary": "12 dead items found: 8 dead files, 1 orphaned surface, 1 orphaned feature, 2 dead entities. 3 test-only files flagged.",
  "findings": [ "..." ]
}
```

The visualizer dispatches on `metric.id = "dead-code"` to render findings grouped by `kind`, with severity badges.

## Workflow Integration

### Agent 10 — Dead Code Analysis (Wave 3.5)

Runs in **parallel** with Agent 8 (Co-location) and Agent 9 (DRYness) during Wave 3.5.

**Inputs:** discover bundle (full file inventory), surfaces, features, entities, operations, compartments.

The agent should:

1. **Build the import map.** For every non-generated file in the codebase, determine which other files import it. Use the file inventory from the discover bundle. Parse import/require statements; resolve path aliases (`@/`).

2. **Identify entry points.** Classify files as entry points using the patterns listed in Detection Layer 1. Entry points are always live.

3. **Detect dead files.** For each non-entry-point, non-generated file: if zero non-test files import it, classify as:
   - `dead-file` (severity: high) if zero files total import it
   - `test-only-file` (severity: low) if only test files import it

4. **Detect orphaned surfaces.** For each surface in the surfaces array, search the codebase for navigation references (Link href, router.push, redirect, nav config) to its route. Surfaces with zero references are orphaned. Exempt: root route, auth callbacks, webhook routes.

5. **Detect orphaned features.** For each feature, check if its `surfaceIds` are all orphaned. Also check if its implementation files are all dead.

6. **Detect dead entities.** For each entity with `kind` of `"db-model"` or `"dto"`, check if any operation references it, any feature references it, or any Prisma query uses it. Entities with zero references are dead.

7. **Compute the score.** `((total_evaluated - dead_items) / total_evaluated) * 100`. Test-only files don't affect the score.

8. **Emit findings.** One finding per dead item, using the finding format above.

**Output:** A dead-code metric object with `score`, `summary`, `thresholds`, and `findings[]`.

### SKILL.md Changes

Update the Wave 3.5 section to add Agent 10:

```
### Wave 3.5: Code Health (parallel)

Spawn **three agents in parallel**, wait for all to finish.

#### Agent 8 — Co-location Analysis
(existing)

#### Agent 9 — DRYness Analysis
(existing)

#### Agent 10 — Dead Code Analysis
(new — see spec-dead-code.md)
```

### Wave 5 Assembly Update

Add the dead-code metric to the `codeHealth.metrics` array:

```
codeHealth.metrics = [coLocationMetric, drynessMetric, deadCodeMetric]
```

### JSON Schema Update

Add the dead-code metric and its finding shape to `references/json-schema.md` under the `codeHealth` section, alongside the existing co-location and DRYness finding documentation.

## Visualizer Updates

The Code Health tab already renders metrics dynamically from `codeHealth.metrics[]`. For the dead-code metric:

- **Sidebar:** New score card with the dead code percentage
- **Finding list:** Group findings by `kind` with collapsible sections (Dead Files, Orphaned Surfaces, Orphaned Features, Dead Entities, Test-Only Files)
- **Finding detail:** Show target, reason, evidence, and recommendation. For file-based findings, include a cross-tab link to Code Organization to see the file in context
- **Severity badges:** Color-coded by severity (high = red, medium = yellow, low = gray)

## Edge Cases

- **No dead code found:** Score = 100%. Summary: "No dead code detected."
- **All surfaces orphaned:** This likely means the agent failed to detect navigation patterns (e.g., programmatic routing). Add a warning in the summary: "All surfaces appear orphaned — navigation detection may be incomplete. Review findings manually."
- **Dynamic imports:** Files loaded via `dynamic(() => import(...))` or `lazy(() => import(...))` should be detected as importers. The agent should grep for dynamic import patterns in addition to static imports.
- **Re-exports:** A barrel file (`index.ts`) that re-exports from another file counts as an importer, even if nothing imports the barrel file itself. The barrel file would be flagged as dead, not its children.
- **CSS/asset files:** CSS modules, image imports, and other non-JS assets imported via bundler conventions are importers. The agent should recognize `import styles from './foo.module.css'` as making `foo.module.css` live.
- **Server action files:** Files with `"use server"` at the top are entry points even if no file explicitly imports them (the framework handles the binding).
- **Generated files excluded:** Same exclusion rules as other metrics: `generated/`, `node_modules/`, `.next/`, `dist/`, `.git/`.
- **Prisma schema models:** The schema file itself is infrastructure (not dead code). Only the models defined within it are evaluated as entities.

## Future Considerations

- **Symbol-level dead export detection** — flag unused exports within live files (deferred: too granular for V1)
- **Field-level entity analysis** — flag unused columns in live models (deferred: high false positive rate)
- **Transitive reachability** — trace from entry points through the full import graph (deferred: zero-importer check is sufficient)
- **Dead route segments** — detect route groups or layouts that have no live child pages
- **Trend tracking** — compare dead code scores across runs to show improvement over time
