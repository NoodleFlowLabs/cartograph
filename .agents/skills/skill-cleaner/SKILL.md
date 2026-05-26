---
name: skill-cleaner
description: Simplifies and tightens an existing skill — improves wording, removes redundancy, restructures sections, and trims edge cases that aren't pulling their weight. Edits the skill in place and then reports exactly what changed and why. Use when the user asks to "clean up", "simplify", "shorten", "tighten", or "refactor" a skill, says a skill has gotten "too long", "bloated", "cumbersome", or "hard to follow", or when another skill (e.g. skill-improver) decides a target skill needs a cleanup pass before more content is layered on. Also use when the user wants a second opinion on whether a skill is doing too much.
---

# Skill Cleaner

A focused editing pass over a single skill. The goal is a leaner, clearer version that says the same things — and protects the same behaviors — in less prose.

Skills accrete over time. Each incident adds a sentence, each correction adds a hedge, each new edge case adds a paragraph. After enough rounds the skill grows past the point where the model can hold it all in working memory, and ironically starts following it *worse* than the original draft. This skill is the counterweight: an honest pass that asks of every line "is this still pulling its weight?"

## What this skill is not

- **Not a rewrite.** Don't restructure for taste, don't impose a different style, don't introduce new conventions. The user's voice and the skill's existing structure stay.
- **Not a feature change.** Don't add new instructions, don't fix bugs you spot in the workflow, don't broaden or narrow what the skill does. If you notice something genuinely wrong, list it in the report — don't silently fix it.
- **Not aggressive.** When in doubt, keep the line. The cost of an over-zealous trim (a regression months later that no one can trace) is much higher than the cost of leaving a slightly verbose paragraph alone.

## Inputs

The user (or calling skill) names a target skill — usually by path (`skills/<name>/SKILL.md`) or short name (`ship`, `ticket`, etc.). If only a short name is given, find it under `skills/` at the repo root. If multiple skills are named, clean them one at a time and produce one report per skill.

If the target is in `.agents/skills/` or `.claude/skills/`, **stop and tell the user**. Those are external meta-skills installed via `npx skills update` and any edit will be overwritten on the next update. They are out of scope.

**Self-cleanup is supported and expected.** `skills/skill-cleaner/SKILL.md` is a valid target like any other user-owned skill — if the user asks you to clean *yourself*, or if skill-improver's cleanup mode (see [skill-improver](../skill-improver/SKILL.md) Step 4b) picks this skill as the candidate, run the same workflow on it. The one wrinkle: you're reading the instructions and editing the file those instructions live in. Read the whole file into context before making the first edit so subsequent edits aren't operating on a stale view, and re-read the relevant section if you're more than a couple of edits in. Otherwise the process is identical — Step 0 still applies (consult skill-creator), the same trim/keep criteria apply, and the report goes back to the user (or caller) the same way. Self-cleanup tends to be the highest-leverage cleanup: every other skill in the repo is judged through these criteria, so keeping this skill itself tight directly affects every future cleanup pass.

## The pass

### Step 0 — Refresh your sense of "good" against skill-creator

Before judging the target skill, read `.agents/skills/skill-creator/SKILL.md` — specifically the "Skill Writing Guide" and "Writing Style" sections. That's the house style this repo's skills are meant to follow: explain the *why* behind instructions, avoid stacks of MUST/NEVER, keep prompts lean, prefer reframing over heavy-handed constraints, bundle scripts for repeated work, use progressive disclosure for large reference files. Those principles are exactly what you're enforcing — if you don't have them fresh, you'll either trim too aggressively (cutting *why* explanations because they look like filler) or not aggressively enough (leaving MUST stacks alone because they "look authoritative").

If `.agents/skills/skill-creator/` isn't present in this repo, fall back to what the user describes as the house style, but flag in the report that you ran without the canonical reference.

### Step 1 — Read the whole skill

Read `SKILL.md` end to end, plus any bundled `scripts/`, `references/`, or `assets/` referenced from it. You can't judge whether a paragraph is redundant until you know what else the skill (and its supporting files) already say. Pay attention to:

- The frontmatter `description` — this is load-bearing for triggering and almost never the right thing to shorten.
- Cross-references to other skills, scripts, or files — anything pointed at from elsewhere has to keep working.
- The skill's commit history if it's interesting (`git log -p -- skills/<name>/SKILL.md`). Recent additions are often defensive reactions to a specific incident — those have a *why* you don't want to trim away.

### Step 2 — Tag each section against the cleanup criteria

Walk through the skill and form an opinion on each chunk. The categories below are what to look for. Note them — don't act yet.

**Trim candidates** (usually safe to remove or shorten):
- **Pure duplication.** The same instruction stated in two places. Keep the one that's in the most natural reading spot; remove the other.
- **Restated obvious.** Sentences that explain what the next paragraph already explains, or that re-narrate what a well-named heading already conveys.
- **Defensive scaffolding.** Stacks of MUST/NEVER/ALWAYS where one sentence with the *why* would do the same work. (See skill-creator's writing-style guidance — heavy-handed musty MUSTs are a yellow flag.)
- **Filler tone.** "It's worth noting that...", "Please be aware that...", "As mentioned above...", "In general,...", trailing recap paragraphs that don't add information.
- **Vestigial edge cases.** A whole paragraph on a scenario that almost never happens, *and* whose mishandling has low blast radius. If the edge case is rare but the consequences are bad (data loss, force push, etc.) — keep it.
- **Examples that don't earn their space.** An example that just restates the prose above it without showing something the prose couldn't. (Examples that demonstrate a tricky case the prose can't easily convey are valuable — keep those.)
- **Stale references.** Pointers to files, scripts, or external systems that no longer exist or have moved.

**Restructure candidates** (consider only if it clearly helps):
- Two sections covering related material that read better merged.
- A long flat list that's actually two natural groups.
- A buried prerequisite that should be hoisted to the top.

Restructure conservatively. Reordering sections changes how the skill scans for someone who already knows it; only do it when the current order genuinely hurts.

**Do not touch:**
- The `name:` field in frontmatter.
- The `description:` field unless it's literally wrong or contains stale references — triggering accuracy lives there, and shortening it usually makes triggering worse, not better.
- "Why" explanations. If a paragraph explains *why* an instruction matters, leave it — that's the load-bearing context that lets the model handle edge cases instead of pattern-matching.
- Anything that gates a destructive or irreversible action (force push, hard reset, deleting work, sending external messages).
- Anything addressing a known past failure — usually visible in the commit message ("fix: add guard against X") or the prose itself ("don't do X — it caused Y last time").
- Concrete examples in the description field that help triggering.

### Step 3 — Make the edits

Apply the trims directly to `SKILL.md` (and any bundled files if applicable). Use the Edit tool, not Write — preserve everything you're not actively changing.

Guidelines while editing:
- Prefer **tightening** over **deleting**. A six-line paragraph rewritten as two lines preserves more intent than the same paragraph removed.
- Keep the same voice. If the skill uses imperative form ("Run the puller. Read the output."), don't rewrite into descriptive form ("The puller is run, then the output is read.").
- Don't combine multiple trims into a single Edit if any of them are uncertain — small, isolated edits are easier to review and to revert.
- Re-read the section after each edit. It's easy to delete a sentence and leave a dangling "This means..." in the next paragraph.

### Step 4 — Sanity check

Before reporting, scan the diff and check:
1. Every instruction the original skill gave is either still there or intentionally trimmed (and listed in the report).
2. No internal cross-reference broke (a section referenced by name still exists; a step number that's referenced elsewhere wasn't renumbered).
3. The frontmatter is intact.
4. The skill still reads top-to-bottom — no orphan transitions, no "as mentioned in Step 4" pointing at a section you removed.

If anything is off, fix it before writing the report.

## The report

After the edits, produce a report. Concise but specific — the user needs to be able to skim it and immediately spot anything they disagree with so they can revert. Use this structure:

```markdown
## Cleaned: skills/<name>/SKILL.md

**Size:** <before lines> → <after lines> (<delta>, e.g. "-38 lines, -22%")

### What got tightened
- <one-line description of the change> — <one-line why>
- ...

### What got removed
- <what was cut, with a short verbatim snippet or section name> — <why it wasn't pulling its weight>
- ...
(omit this section entirely if nothing was removed)

### What got restructured
- <what moved or merged> — <why it reads better this way>
(omit this section entirely if nothing was restructured)

### Left alone on purpose
- <anything you considered trimming but decided to keep> — <why>
(use this for non-obvious calls — don't list every untouched paragraph; the point is to show the user where you exercised restraint so they trust the calls you did make)

### Notes
- <anything you noticed but didn't act on — e.g. a workflow bug, an outdated reference, a section that might be a candidate for promotion to a separate skill>
(omit if nothing to flag)
```

The "Left alone on purpose" section is the most important part of the report for trust-building. If you considered removing a paragraph but kept it because it explains the *why* behind a safety check, say so — that tells the user you read carefully and made deliberate calls, not just a mechanical word-count pass.

## When called by another skill

If invoked by skill-improver (or any other automation) rather than directly by a human:

- Same workflow, same report — the report goes back to the caller for inclusion in whatever it ships (e.g. a PR body).
- Do not commit, branch, or open a PR yourself. The caller owns the surrounding workflow and is the one with context on how this cleanup fits with their other edits.
- If you decide there's nothing meaningful to clean, say so explicitly in the report ("No changes — skill is already tight"). The caller needs an unambiguous signal.

## Calibration

A good run usually:
- Removes 10–30% of lines on a skill that's grown organically over many edits.
- Removes 0–5% on a skill that's already tight (and the report says so).
- Makes 5–15 small edits rather than one big rewrite.
- Leaves the skill's intent, voice, structure, and triggering behavior unchanged.

A bad run:
- Strips out "why" explanations because they look like filler.
- Removes the description field's specificity to make it "snappier" — kills triggering.
- Restructures for the sake of restructuring.
- Removes a safety guard because the skill "should already know that."
- Produces a report that just lists line counts without per-change rationale.

If a target skill is genuinely fine, that's a successful run too. Say so and stop.
