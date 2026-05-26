---
name: cartograph
description: >
  Map a codebase into a structured vocabulary — surfaces, features, entities,
  flows, compartments, invariants, tech stack — plus code-health metrics.
  Produces a JSON map and an interactive local UI. Use whenever the user wants
  to understand or audit a codebase.
---

# Cartograph

Extract a structural map of a codebase: surfaces, features, entities, relationships, operations, flows, compartments, and tech stack. Four orthogonal axes — surfaces are where you go (pages/entry points), features are what you can do (standalone capabilities), entities are what the app works with (data), and compartments are how the code is organized (logical file groupings that bridge product concepts to the underlying codebase). The tech stack provides a comprehensive inventory of all technologies, frameworks, and libraries the project uses.

## Workflow

### Intent Detection

The default mode is **Full Scan** — produce a full structural map of the codebase plus code health. Run this unless the user's message clearly asks for one of the invariant-specific modes below.

Two narrower modes override the default:

1. **Add Invariant** — message contains "add invariant", "new invariant", or "add this invariant: '...'" → **Add Invariant Flow**.
2. **Standalone Verify** — message contains "verify", "check invariants", "run invariants", or similar → **Standalone Verify Flow**.

---

### Full Scan

A scan has four steps:

1. **Discover** — read the codebase to build the context every extract task needs.
2. **Extract** — produce the structural map.
3. **Analyze** — assess the assembled map for code health and invariants.
4. **Assemble** — merge everything into `.cartograph/mapping.json`.

Within Extract and Analyze, fan out via subagents on anything whose inputs are ready — don't run them serially in the orchestrator, wall time matters. The natural parallel batches are:

```
{ Surfaces, Entities }
  → { Features, Operations }
  → { Flows, Compartments, File Tree Weights }
  → { Compartment Dependencies }
  → { Co-location, DRYness, Dead Code, Invariants }
```

Every task below names its inputs and what it returns. All return shapes conform to `references/json-schema.md`.

---

#### 1. Discover

Run this yourself before fanning out — it's fast and every Extract task needs it.

1. Read `package.json` for project name and dependencies (framework detection).
2. Glob for key structural files:
   - Schema: `**/*.prisma`, `**/schema.*`, `**/models/**`
   - Routes/Pages: `app/**/page.{tsx,ts,jsx,js}`, `app/api/**/*.{ts,js}`, `pages/**/*.{tsx,ts}`
   - Server actions: grep for `"use server"`
   - Components: `components/**/*.{tsx,jsx}`
   - Lib/services: `lib/**/*.{ts,js}`, `services/**/*.{ts,js}`
3. Read the directory tree to understand the overall shape.
4. **Detect the tech stack.** For each technology in use, record name, version, category, source (where you found it), and confidence (high = explicit dependency + matching config; medium = dependency only; low = inferred from patterns). The full catalog of detection signals — config files, file patterns, import patterns — lives in `references/tech-stack-detection.md`. The category list lives in `references/json-schema.md`.
5. Collect the full non-generated file inventory.

Returns the **discover bundle**: file inventory + tech stack array. Pass this to every Extract and Analyze task.

---

#### 2. Extract

##### Surfaces

**Needs:** discover.

Surfaces are entry points — self-contained user-facing experiences. Each app is fundamentally a collection of surfaces.

1. Walk the route tree (`app/**/page.tsx`) and identify each distinct user-facing experience.
2. Group related routes into surfaces (e.g., `/create` + `/create/[id]/edit` = one "Creation Studio" surface).
3. Look for admin-only areas, standalone tools, dashboards, and onboarding flows.
4. For each surface determine: **entrypoint** (main page file and route), **actor** (user/admin/system), **description** (what this surface does as a standalone experience).

**Returns:** surfaces array (without `entityIds`, `operationIds`, `flowIds`, or `compartmentIds` — those get back-filled by later tasks and Assemble).

##### Entities + Relationships

**Needs:** discover.

**Entities** — read schema/type definitions and extract domain objects:

1. **DB models** (high confidence) — Prisma models, TypeORM entities, Mongoose schemas.
2. **TypeScript types/interfaces** (medium confidence) — types used as API payloads, form data, state.
3. **Enums** (high confidence) — enum definitions representing domain concepts.
4. **Derived types** (medium confidence) — transformed versions like `PostWithAuthor`.

For each entity: id, name, kind, description, source location, key fields (3–8 most important), confidence.

**Relationships** — map connections between entities:

1. Foreign keys and references in schema → `has-many`, `belongs-to`, `has-one`.
2. Nested includes/joins → confirm relationships.
3. Type compositions → `derives-from`.
4. Looser references → `references`.

**Returns:** two arrays — `entities` and `relationships`.

##### Features

**Needs:** discover, surfaces, entities.

Features are standalone capabilities embedded within surfaces — what you can *do* in the app, as distinct from where you *go*. A like button, a prompt wizard, a credit purchase, an age gate are all features. They compose into surfaces; they aren't themselves pages.

If you can't describe a feature without naming a specific page, it's probably part of a surface, not a feature.

**The six kinds** — tool, interaction, transaction, gate, infrastructure, workflow — and the code patterns that signal each are catalogued in `references/feature-kinds.md`. Use that as your scanning checklist.

**Separate implementations are separate features.** The same conceptual capability often exists as independent implementations in different surfaces — a user-facing "Prompt Wizard" modal in chat and an admin "Prompt Remix Wizard" in the post-management area. Always create separate feature entries; name them distinctly. After extracting from one surface, scan the others' component trees for similar patterns and grep for shared service imports — this is the easiest class of feature to miss.

For each feature record: name, description, kind, `surfaceIds`, `entityIds`, implementations (2–5 most important files, not every file).

**Returns:** features array (without `compartmentIds` — Compartment Dependencies fills that in).

##### Operations

**Needs:** discover, entities.

For each entry point (route handler, server action, API endpoint):

1. Which entity it targets.
2. Operation type: `create`, `read`, `update`, `delete`, or `domain`.
3. Descriptive name (e.g., "Publish Post", "Generate Preview").
4. Side effects on other entities.
5. Implementation location (file + function).

**Returns:** operations array.

##### Flows

**Needs:** discover, surfaces, entities, features, operations.

1. Start from UI pages — what can a user do on each page?
2. Trace: UI action → handler → service → DB.
3. Name each flow by its user-visible goal.
4. Identify trigger and actor (user/admin/system).
5. List steps in order, linking to operations and entities.

**Returns:** flows array.

##### Compartments

**Needs:** discover, surfaces, features, entities, operations.

Compartments are logical groupings of related files that form cohesive units of functionality. They bridge the product-side view (surfaces, features) with the underlying code structure, so a developer can navigate from "what does this feature do?" to "where does that code live?".

1. Scan the file tree, using surfaces, features, entities, and operations as context.
2. Group files using multiple signals:
   - **Folder structure** — files in the same directory often belong together.
   - **Import graph** — files that heavily import each other are likely in the same compartment.
   - **Feature alignment** — files belonging to a feature should cluster into compartments mapping to those features.
   - **Domain proximity** — files dealing with the same entity or business concept belong together.
   - **Naming conventions** — files with related names (e.g., `image-*.ts`, `*-generation.*`) suggest a compartment.
   - **Shared infrastructure** — files used by 3+ features may warrant their own compartment, or may appear in multiple compartments.
3. Compartments are **nestable** — sub-compartments can be nested to any depth. A typical web app has 2–3 levels.
4. Files are **non-exclusive** — a file can appear in multiple compartments (e.g., `lib/prisma.ts` in both "Database Access" and "Shared Infrastructure").
5. **Every non-generated file must appear in at least one compartment.** Config files, build tooling, etc. go into a "Project Infrastructure" compartment. Exclude `generated/`, `node_modules/`, `.next/`, `dist/`.
6. For each compartment: **name and description** (name after what it does, not folder names — "Image Generation Pipeline" not "app/chat/actions"), **tags** (from the vocabulary in `references/json-schema.md`, plus custom as needed), **files** (with role: component, hook, action, api, lib, type, config, style, test, other), **parentId** (null for top-level), **featureIds**, **surfaceIds**.

Guidelines that keep compartments useful:

- Don't create compartments with only 1 file unless it's a genuinely standalone module — merge small groupings into their parent.
- Keep top-level compartments to 8–15 for a typical web app. Sub-compartments can be more.
- Prefer meaningful groupings over 1:1 folder mapping. If a folder mixes unrelated files, split them. If related files span folders, group them.

**Returns:** compartments array (without `dependsOn` — Compartment Dependencies fills that in).

##### File Tree Weights

**Needs:** discover, features.

For every non-generated file, estimate what proportion of the file's purpose serves each feature.

1. Take the full file list from the discover bundle.
2. For each file, read it (or sample very large files) and estimate proportions.
3. Files that don't belong to any product feature get `"__infrastructure__"` as their sole feature weight.
4. Files serving multiple features get proportional weights (e.g., a shared hook → 50/50).
5. All weights for a file must sum to 1.0.

Estimation guidance:

- Look at imports, function names, component names, and the overall purpose of the file.
- A file 100% dedicated to one feature → `[{featureId: "that-feature", weight: 1.0}]`.
- A shared utility used by multiple features → split proportionally.
- Config files, generic type definitions, build config, middleware → `__infrastructure__`.
- Prefer fewer features per file with higher weights over many features with tiny weights.

**Returns:** array of `{file, featureWeights: [{featureId, weight}]}` entries — one per file.

##### Compartment Dependencies

**Needs:** compartments (plus surfaces and features for back-filling).

1. Walk the imports of every file in every compartment.
2. Map each imported file to the compartment(s) it belongs to.
3. Record these as `dependsOn` edges on each compartment (inter-compartment only, no self-references).
4. Populate `compartmentIds` on features — for each feature, determine which compartments implement it.
5. Populate `compartmentIds` on surfaces — for each surface, determine which compartments serve it.

**Returns:** updated compartments array (with `dependsOn` populated), plus a `featureCompartmentIds` map and a `surfaceCompartmentIds` map.

---

#### 3. Analyze

Runs on the assembled extract.

**How analysis tasks report.** Each analysis task emits a metric record with a score, a thresholds object, a one-line `summary`, and a `findings[]` array. The findings *are* the explanation for the score — every file or item that pulled the score below 100 must appear as a finding, with a concrete recommendation. The summary must include exact counts ("8 of 103 evaluated files are misplaced"), not vague prose ("most files are correctly placed").

A sub-100 score with no findings is unactionable — treat it as a bug in your output, not a valid result.

Each task's specific finding shape lives in `references/json-schema.md` under the metric's name.

##### Co-location

Read project instructions (`AGENTS.md`, `CLAUDE.md`, or equivalent) and extract explicit co-location conventions. If none are found, fall back to:

- Files used by a single surface should live inside that surface's directory.
- Files shared by multiple surfaces but representing one capability belong in `features/<capability>/`.
- Root `components/`, `lib/`, and `actions/` are reserved for truly global code used by 3+ surfaces/features.
- `components/ui/*` is exempt and considered correctly placed.

Evaluate every non-generated, non-infrastructure file:

1. Trace which files import it.
2. Determine which surfaces/features actually consume it.
3. Compare its current location to where the rules say it should live.
4. Assign a binary `pass` / `fail` verdict.

For each failing file, emit a finding with `action: "move"` (co-locate inside a surface or feature directory) or `action: "promote"` (move up into `features/` because it serves multiple surfaces). Include `file`, `verdict`, `reason`, `consumers[]`, and `recommendation`.

Score: `(passing files / total evaluated files) * 100`.

**Returns:** one metric object with `id: "co-location"`.

##### DRYness

1. Use features and compartments as the starting map.
2. Look for candidate duplication before reading files:
   - Features with the same `kind` and overlapping `entityIds` across different surfaces.
   - Files in different surfaces with similar names or import patterns.
   - Compartments with similar descriptions, tags, or overlapping `featureIds`.
   - Hooks/actions/clients that wrap the same external API or workflow.
3. Read the candidates to confirm real overlap — weigh both **functional overlap** (same product problem solved twice) and **structural similarity** (same technical pattern repeated with light variation).
4. For each confirmed duplication: identify what's genuinely shared, what must stay implementation-specific, and where shared logic should live (respecting co-location rules).

Each finding includes `id`, `title`, `severity`, `implementations[]`, `sharedLogic[]`, and `recommendation`.

Score: `K = 200 / totalNonInfrastructureFiles`; `score = max(0, 100 - (findingCount * K))`.

**Returns:** one metric object with `id: "dryness"` and `scalingFactor`.

##### Dead Code

1. Build an import map for every non-generated file (resolve relative imports and `@/` path aliases).
2. Use the always-live entry-point list from `references/dead-code-detection.md` — those never count as dead even with zero importers.
3. Walk the codebase looking for the five finding kinds documented in `references/dead-code-detection.md`:
   - `dead-file` — non-entry-point with zero importers.
   - `test-only-file` — non-test file imported only by tests (informational; doesn't affect the score).
   - `orphaned-surface` — surface with no inbound navigation references.
   - `orphaned-feature` — feature with empty `surfaceIds` or all-orphaned surfaces.
   - `dead-entity` — DB model or DTO with no operation, feature, or query reference.

Each finding includes `id`, `kind`, `severity`, `target`, `reason`, `evidence`, `recommendation`.

Score: `totalEvaluated = filesEvaluated + surfacesEvaluated + featuresEvaluated + entitiesEvaluated`; `deadItems = deadFiles + orphanedSurfaces + orphanedFeatures + deadEntities`; `score = ((totalEvaluated - deadItems) / totalEvaluated) * 100`. Exclude test-only files from both numerator and denominator.

**Returns:** one metric object with `id: "dead-code"`.

##### Invariants

Runs only if `cartograph-invariants.md` exists at the repo root. Otherwise return `null` and Assemble omits the `invariants` key entirely.

1. Read `cartograph-invariants.md`.
2. For every invariant, run the **Verifying an invariant** procedure below.
3. Compute summary counts (total, passing, failing, skipped).
4. Set `verifiedAt` to the current ISO 8601 timestamp and `definitionsFile` to `"cartograph-invariants.md"`.

**Returns:** the `invariants` object matching the schema in `references/json-schema.md`, or `null`.

---

#### 4. Assemble

Run this yourself. Merge everything into `.cartograph/mapping.json`:

1. Populate `entityIds`, `operationIds`, `flowIds`, and `compartmentIds` on each surface — from operations, flows, and the Compartment Dependencies output.
2. Populate `compartmentIds` on each feature — from the Compartment Dependencies output. Set `"files": []` (the empty array is the back-compat shape; `compartmentIds` is the primary code mapping).
3. Include the `techStack` array from Discover as-is.
4. Include the File Tree Weights array as-is under `fileTree`.
5. Add a top-level `codeHealth` object: `analyzedAt = ISO timestamp`, `metrics = [coLocationMetric, drynessMetric, deadCodeMetric]`.
6. If the Invariants analysis returned a non-null result, include `"invariants": <result>`. If `null`, omit the key.
7. Write `.cartograph/mapping.json` at the repo root, creating the `.cartograph/` directory if needed. The final shape lives in `references/json-schema.md`.
8. Tell the user: "Start the Cartograph UI from your project root with `npm --prefix skills/cartograph/app install` once, then `npm --prefix skills/cartograph/app start`." If invariants were verified, also print the invariant summary (same format as Standalone Verify).

---

### Add Invariant Flow

When the user wants to add a new invariant:

1. Extract the user's assertion text (the natural-language claim after "add invariant:" or similar phrasing).
2. Read the codebase to understand the assertion:
   - Identify relevant files, functions, and patterns related to the assertion.
   - Determine which surfaces and features are involved (if a previous `.cartograph/mapping.json` exists, reference its IDs for `surfaceIds` and `featureIds`).
   - Map out the verification approach.
3. Expand the one-liner into a full invariant definition following `references/invariant-definitions-format.md`:
   - Write the YAML frontmatter: generate a unique kebab-case `id`; set `severity` (critical for money/security/data integrity, high for core product logic, low for conventions); add relevant `tags`; optionally add `surfaceIds`/`featureIds`.
   - Write all body sections: **Assertion**, **Verification steps**, **Pass criteria**, **Known scope**, **Verification prompt**.
4. Append the invariant to `cartograph-invariants.md` at the repo root. Create the file with a `# Cartograph Invariants` heading if it doesn't exist.
5. Run an initial verification using the **Verifying an invariant** procedure below.
6. Report the result:
   - Passing: "Invariant added and verified. Definition saved to `cartograph-invariants.md`."
   - Failing: "Invariant added but does NOT currently hold — definition saved anyway. Violations: [details]. Fix the code to make it pass, or edit the definition if the assertion needs adjusting."

If the assertion is too vague to determine verification steps, ask a clarifying question before writing the definition.

---

### Standalone Verify Flow

When the user wants to verify existing invariants without a full scan:

1. Read `cartograph-invariants.md` from the repo root. If the file doesn't exist: respond "No invariant definitions found. Add one with: `/cartograph add this invariant: '...'`".
2. Run the **Verifying an invariant** procedure below on every invariant in the file.
3. Print a pass/fail summary to the console:

   ```
   Invariant Results (N checked)
   ──────────────────────────────────
   ✓ CRITICAL  Invariant name
     Summary of passing result

   ✗ HIGH  Invariant name
     Violation in file:line
     Brief description of violation

   N of M invariants passing.
   ```

4. If `.cartograph/mapping.json` exists, update **only** the `invariants` key (leave all other data untouched). Write the `invariants` object following the schema in `references/json-schema.md`.
5. If `.cartograph/mapping.json` doesn't exist, create the `.cartograph/` directory if needed and write a minimal JSON with only `meta` and `invariants` keys.

---

### Verifying an invariant

The shared procedure used by Add Invariant Flow, Standalone Verify Flow, and the Invariants analysis task in Full Scan.

1. Parse the invariant: extract frontmatter fields and body sections (see `references/invariant-definitions-format.md`).
2. If `enabled: false`, emit a `"skipped"` result and stop.
3. Follow the **Verification steps** section as a guide; read files listed in **Known scope** plus anything the steps reference.
4. Evaluate whether the **Pass criteria** hold:
   - Passing: record checked files, an empty violations array, and set `fixPrompt` to `null`.
   - Failing: record specific violations with file paths, line numbers, what was expected, what was found, and a suggestion. Generate a self-contained `fixPrompt` that an AI agent can use to fix the specific violations — include the invariant name, violation details, affected paths/lines, and what needs to change.
5. Set `verificationPrompt` on every result (passing or failing) to the **Verification prompt** from the invariant definition.

The result shape lives in `references/json-schema.md` under the `invariants` key.

---

## Important

- **Read-only on the analyzed codebase** — never modify it. Only `.cartograph/mapping.json` and (on user request) `cartograph-invariants.md` are written.
- **Prefer inclusion with lower confidence** over omission when unsure.
- **Plain-language descriptions** — a PM should be able to read them.
- **Relative paths** — all file paths relative to repo root.
- **Large repos** — analyze by feature/route directory and merge.
