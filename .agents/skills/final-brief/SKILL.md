---
name: final-brief
description: Generates a rich, visual HTML one-pager describing the FINAL state of a branch or PR stack — what the code does now, how the key pieces work, and how each PR evolved (every commit beyond the initial slice and why it landed — review findings, user steering, or otherwise) — so a busy reviewer can do a confident final pass before merge. Use this after the work is done and reviewed — at a pre-merge gate in a shipping workflow once review is complete, or when the user asks to "explain the final code", "walk me through what shipped", "summarize the branch / the stack before merge", "what did the review change", or wants an overview of finished work. It leads with high-stakes surface area (service endpoints, auth, schema), walks the important functions, and traces every follow-up commit in each PR to the finding or steer that caused it. Reach for this skill whenever someone wants to understand finished, reviewed code before merging it — even if they don't say "brief" or "HTML".
---

# Final Brief

Produce a **rich, visual one-pager** — a single self-contained HTML file, designed like a dense dashboard rather than a written document — that lets a time-pressed reviewer understand the **finished, reviewed state** of a branch or PR stack and merge it with confidence, without reading the code or the review thread themselves.

This is the bookend to `draft-brief`. Where `draft-brief` answers "what is being proposed and how is it sliced," `final-brief` answers "what does the code actually do now, and how did each PR get to its final shape." The reader is the same busy manager: front-load the high-stakes surface area, explain the real logic clearly, and never trade clarity for brevity. Be thorough — just put what matters first.

## When this runs

- **As part of a shipping workflow**: once the work is finished and review is complete (PRs are review-clean or all findings triaged) and the workflow is about to hit a merge gate. The brief is what the user reads before giving the merge signal.
- **Standalone**: any time someone wants to understand finished, reviewed work before merging it.

## Voice — make it read like a story

A page of tables and callouts is quick to skim but hard to truly absorb: the reviewer gets facts without the thread that connects them. So beyond being well-structured, the brief should *read* — like walking a colleague through the finished work, not filing a report. This matters most in the code walkthrough: explaining how the feature works is inherently a narrative, not a list.

- The TL;DR is a genuine narrative opener: a few plain sentences telling the story of what shipped — the problem it addresses, how it was solved, and what review changed along the way.
- Every section opens with a one- or two-sentence plain-prose lead-in that frames what follows and ties it back to the whole. The dense table or callout list then sits beneath that lead-in.
- The code walkthrough should flow as a guided tour — each function explained in prose, in an order that builds understanding — not a flat catalogue of signatures.
- Prefer plain, connected sentences over terse fragments.

Keep this as connective tissue, not bulk. The prose threads the visual elements together; it never replaces them and never pushes the page long. A skimmer still gets everything from the structure; a top-to-bottom reader gets a coherent story.

## Step 1 — Gather the material

Identify the trunk branch the work is based on (usually `main`). Collect the finished state of the work against it — the cumulative diff and stats, and every commit on the branch or stack with its full message.

If a PR stack exists, gather it too: the PRs, their status (open / merged), and which branch maps to which PR.

**Find the review findings, if review happened.** This is what makes a *final* brief different from a draft one. Pull the review threads on the PRs — both the summary reviews and the inline comments. Review-fix commits are typically one focused commit per finding, with a message that references the finding it addressed; cross-reference commit messages against the review comments to build the finding → commit mapping. If there was no review (no PRs, no comments), skip the review section entirely — just brief the final state.

**Ignore any pre-existing brief files.** `.briefs/` may already contain briefs from earlier runs or other work. They are never an input — they may be stale or obsolete, and that does not matter. Do not read them. Every invocation generates a brand-new brief from the current state of the work.

## Step 2 — Triage by stakes

Sort the final change into tiers; this ordering drives the page.

**Tier 1 — High-stakes (lead with these):**
- Service endpoints / API routes added or changed — the new surface area, in its final form.
- Auth, authz, access control, sessions, secrets, CORS.
- Database schema changes — final tables/columns/constraints/indexes.
- New external dependencies, config/env changes, anything destructive or irreversible.

**Tier 2 — Core logic:** the important functions and modules that carry the feature.

**Tier 3 — Routine:** UI, refactors, tests, docs.

If a tier is empty, say so — "no auth changes" is useful information.

## Step 3 — Schema changes get line-by-line treatment

If the schema changed, walk it — do not summarize. One row per individual change: table/model, exact field, before → after, nullability, default, index/constraint impact, and the practical consequence (backfill needed, data loss on a drop, non-null-without-default failure on a populated table). The reviewer should be able to audit the entire schema delta from this section. Show it in its final, post-review form.

## Step 4 — Walk the important code

This is the heart of a final brief. For the functions and modules that carry the feature — prioritizing endpoints, auth, and core logic over routine glue — explain each one so a reviewer understands the behavior without opening the file:

- What it does, in one line.
- Its signature / inputs / outputs.
- The key logic or algorithm — control flow, edge cases, anything subtle.
- Where it's called from and what depends on it.

Don't walk every function — walk the ones that matter. A reviewer should finish this section understanding how the feature actually works.

## Step 5 — Trace how each PR evolved

A PR in the stack rarely stays at its first commit. It starts as the single slice from the stack split, and then commits accumulate on top — some fixing review findings, some because the user steered the feature in a new direction mid-flight, some for other reasons (CI fixes, restacking fallout, follow-up polish). The final brief must account for **all of them**: the reviewer needs to see not just the end state but how each PR got there and why.

For each PR in the stack, walk its full commit history:

- Separate the **initial commit** (the original slice) from the **follow-up commits** stacked on top of it.
- For every follow-up commit, explain *what* it changed and *why* it landed. Attribute it to a cause — a specific review finding, a user steer or scope change, or something else — by cross-referencing the commit message against the review threads and the conversation history. Don't just restate the commit message; say what prompted the commit.
- For review findings specifically, also surface findings that were **skipped**, with the reason — a reviewer wants to see what was consciously *not* fixed, not only what was.

Present this per PR: the initial commit as a baseline, then a chronological list of follow-up commits, each tagged with its cause (review finding / user steering / other) and a one-line description of the change. This turns a bare "5 commits" into a readable account of how the PR converged on its final shape.

## Step 6 — Build the HTML one-pager

Write one self-contained `.html` file — all CSS inline in a `<style>` block, no external requests, no JS frameworks. It must open straight from disk.

**Aim for the goal, not a fixed layout.** A reviewer should be able to grasp the high-stakes surface area and the review outcome from the top of the page within roughly half a minute, and read the whole brief without much scrolling. Beyond that, the visual design is yours — pick a structure that serves *this* particular work. A small bugfix wants a very different shape from a multi-PR feature with heavy review activity. Don't force a one-size-fits-all template.

**Content worth considering** (use what's relevant to this work, skip what isn't, in whatever order best serves the reader):

- **What the reader needs up front** — branch/stack, trunk, change counts, review status (e.g. "review clean" / "N findings, all addressed"), a generated timestamp, and a short narrative TL;DR of what shipped and why.
- **High-stakes callouts in their final form** — endpoints, auth, schema, deps, config, anything destructive. Make these visually unmissable.
- **PR stack** — if a stack exists, one entry per PR with slug, summary, status (open/merged), size.
- **Schema changes line by line** — if the schema changed, the per-change walkthrough from Step 3.
- **Code walkthrough** — the guided tour of the important functions from Step 4, grouped in whatever way best helps the reader build a mental model.
- **PR evolution** — if any PR has follow-up commits, the per-PR commit timeline from Step 5 (initial commit, then each follow-up tagged by cause: review finding / user steering / other), plus any skipped review findings.
- **A compact file index**, if there's room and it adds value.

**Visual craft** — this lands in front of a manager, so it should look deliberate, not generic: clear type hierarchy, color used purposefully (priority, severity, review state), monospace for code and paths, real whitespace rhythm. Avoid the generic AI-generated look. If a `frontend-design` skill is available, lean on its principles.

## Step 7 — Save, open, and self-check

Save the file into a `.briefs/` directory at the repo root, naming it after the change so it never collides with briefs from other work — e.g. `final-brief-<slug>.html`, where `<slug>` is the branch name or a short slug of what the change does. Make sure that directory is ignored by version control so the brief is never committed — prefer a local, uncommitted ignore rule over editing a tracked ignore file. Then open the brief in the user's browser.

Before handing off, check:
- Could a reviewer who reads only the first screenful name every high-stakes change and tell that review passed?
- Is every schema change accounted for line by line?
- Does the code walkthrough actually explain how the feature works, or just list files?
- Is every follow-up commit in each PR explained and attributed to a cause (review finding / user steering / other), including skipped review findings?
- Did you claim a stack/review section that doesn't actually apply (or omit one that does)?

Then tell the user the brief is ready and where it is.
