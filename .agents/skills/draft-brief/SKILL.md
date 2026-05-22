---
name: draft-brief
description: Generates a rich, visual HTML one-pager that summarizes the current working-tree changes — and the proposed PR stack, if one exists — so a busy reviewer can grasp the work and approve it fast. Use this whenever someone needs an overview of in-progress changes before sign-off — at a stack-breakup or pre-approval gate in a shipping workflow, or when the user asks to "review the changes", "show me what changed", "summarize the diff / the branch", "what am I about to approve", or wants a digest of the working tree before approving. The brief leads with high-stakes changes (new service endpoints, auth/access control, database schema) and walks schema changes line by line. Reach for this skill whenever someone wants to eyeball a body of uncommitted work before approving it — even if they don't say the words "brief" or "HTML".
---

# Draft Brief

Produce a **rich, visual one-pager** — a single self-contained HTML file, designed like a dense dashboard rather than a written document — that lets a time-pressed reviewer understand a body of in-progress changes and decide whether to approve them, without reading the diff themselves.

The reader is a busy manager. They might give this 30 seconds or they might give it 10 minutes; the brief has to reward both. So the structure is strictly **priority-ordered**: the highest-stakes, hardest-to-undo changes come first, and the long tail of routine edits comes last. The goal is maximum signal in minimum time — but never trade away clarity to save the reader a few seconds. Be thorough; just front-load what matters.

## When this runs

- **As part of a shipping workflow**: once a body of work is implemented but not yet approved — typically when an agent has a working-tree diff and a proposed PR stack and is about to ask the user to approve the breakup. The brief is the thing the user reads at that approval gate.
- **Standalone**: any time someone wants to review uncommitted work before approving it.

## Voice — make it read like a story

A page of tables and callouts is quick to skim but hard to truly absorb: the reviewer gets facts without the thread that connects them. So beyond being well-structured, the brief should *read* — like walking a colleague through the change, not filing a report.

- The TL;DR is a genuine narrative opener: a few plain sentences telling the story of this change — the problem it addresses, what was done about it, and what's worth a careful look.
- Every section opens with a one- or two-sentence plain-prose lead-in that frames what follows and ties it back to the whole. The dense table or callout list then sits beneath that lead-in.
- Prefer plain, connected sentences over terse fragments.

Keep this as connective tissue, not bulk. The prose threads the visual elements together; it never replaces them and never pushes the page long. A skimmer still gets everything from the structure; a top-to-bottom reader gets a coherent story.

## Step 1 — Gather the material

Identify the trunk branch the work is based on (usually `main`). Then collect the full picture of what changed against it — the diff stats, the actual diff, and any commits already made on the branch. Crucially, include **untracked files**: brand-new files often carry the most important code in the change and are easy to miss. Read whatever you need directly to understand it.

**Find the proposed PR stack, if one exists.** It may already be in the current conversation context, or saved in a file named `proposed-pr-stack.md` (look in the repo root and `.briefs/`). If neither exists, that is fine — some changes have no stack. Just brief the changes and omit the stack section entirely. Do not invent or propose a stack yourself.

**Ignore any pre-existing brief files.** `.briefs/` may already contain briefs from earlier runs or other work. They are never an input — they may be stale or obsolete, and that does not matter. Do not read them. Every invocation generates a brand-new brief from the current state of the change.

## Step 2 — Triage every change by stakes

Before writing anything, sort what you found into tiers. This ordering drives the whole page.

**Tier 1 — High-stakes (lead with these, make them impossible to miss):**

- New or changed **service endpoints / API routes / route handlers** — anything that adds surface area.
- **Auth, authz, access control, sessions, secrets, CORS** — anything touching who-can-do-what.
- **Database schema changes** — new tables/columns, type changes, constraints, indexes, drops.
- New **external dependencies**, changed **config / environment variables**, anything **destructive or irreversible**.

**Tier 2 — Behavior changes:** business logic, data flow, API response shapes, migrations of existing behavior.

**Tier 3 — Routine:** UI tweaks, refactors, tests, docs, formatting.

If a tier is empty, say so explicitly ("No auth or schema changes") — absence of high-stakes change is itself valuable information for the reviewer.

## Step 3 — Schema changes get line-by-line treatment

Schema changes are the single most dangerous thing in most diffs and the easiest to wave through. So when the schema source changed (`schema.prisma`, `db/schema.ts`, migration files, model definitions), do **not** summarize — walk it.

For each individual change produce one row: the table/model, the exact field, old state → new state, nullability, default, index/constraint impact, and the practical consequence ("existing rows need a backfill", "this drop loses data", "non-null without default will fail on a populated table"). The reviewer should be able to audit the schema delta entirely from this section.

## Step 4 — Build the HTML one-pager

Write one self-contained `.html` file — all CSS inline in a `<style>` block, no external requests, no JS frameworks. It must open straight from disk.

**Layout** — think dashboard or poster, not document. Use a dense, multi-column grid that fills the width of a desktop viewport. The first screenful (~1440×900) must be self-sufficient: a reviewer who reads only the top of the page should still come away knowing the riskiest things in the change. Keep the whole page tight — a reviewer should not have to scroll far. Cut padding and filler before you cut content.

**Sections, in this order:**

1. **Header bar** — branch name, trunk it's based on, change counts (N files, +X/−Y lines, N commits), generated timestamp.
2. **TL;DR** — 2–3 plain-language sentences: what this change does and why. Someone who reads only this should get the gist. Make it visually prominent.
3. **Watch items** — a can't-miss panel of Tier 1 callouts: new endpoints, auth changes, schema changes, new deps, config changes. Color-code by severity. If there are none, say so.
4. **Proposed PR stack** _(only if one exists — otherwise omit)_ — a vertical stack visual, bottom→top, one card per PR: slug, one-line summary, size, key files. This shows the reviewer how the work is sliced.
5. **Schema changes — line by line** _(only if schema changed)_ — the per-change table from Step 3.
6. **Changes by area** — Tier 2 then Tier 3, grouped by feature/area, each with a short description and the files touched.
7. **File index** — compact full file list with per-file +/− counts, if there's room.

**Visual craft** — this is a thing a manager looks at, so it should look considered: clear type hierarchy, generous use of color to encode priority (red/amber for high-stakes, neutral for routine), monospace for code/paths/identifiers, real whitespace rhythm. Avoid a generic AI-generated look — make it feel like a deliberate internal dashboard. If a `frontend-design` skill is available, lean on its principles.

## Step 5 — Save, open, and self-check

Save the file into a `.briefs/` directory at the repo root, naming it after the change so it never collides with briefs from other work — e.g. `draft-brief-<slug>.html`, where `<slug>` is the branch name or a short slug of what the change does. Make sure that directory is ignored by version control so the brief is never committed — prefer a local, uncommitted ignore rule over editing a tracked ignore file. Then open the brief in the user's browser.

Before handing off, check the brief against its purpose:

- Could a reviewer who reads only the first screenful name every high-stakes change? If not, re-prioritize.
- Is every schema change accounted for line by line?
- Did you claim the stack section but no stack actually exists (or vice versa)?
- Is anything padded? Tighten it.

Then tell the user the brief is ready and where it is.
