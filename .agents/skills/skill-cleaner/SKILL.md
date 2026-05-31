---
name: skill-cleaner
description: Improves how an existing skill reads and flows — tightens wording, removes redundancy, fixes structure, and resolves instructions that contradict each other across sections — so it's easy to follow for both humans and the agent executing it. Reducing length is incidental, not the aim; a skill that's long because it carries important detail can stay long. Edits the skill in place, then reports what changed and why. Use when the user asks to "clean up", "simplify", "tighten", "refactor", or "improve the flow/structure" of a skill, says it's "too long", "bloated", "cumbersome", "hard to follow", or "has conflicting instructions", or when another skill (e.g. skill-improver) flags a target for a cleanup pass. Also use when the user wants a second opinion on whether a skill reads well or is doing too much.
---

# Skill Cleaner

A focused editing pass over a single skill. The goal is a version that **reads easily and flows well — for both a human and the agent executing it — with no instructions that contradict each other, while staying thorough and protecting every behavior.** Often that means less prose, but not always: a skill that's long because it carries genuinely important information should stay that way. Length is not the enemy — confusion is. Tightening wordy passages, fixing structure that reads out of order, and reconciling instructions that fight across sections all serve that goal. Raw line-count reduction is a side effect, never the objective.

Skills accrete over time. Each incident adds a sentence, each correction adds a hedge, each new edge case adds a paragraph. After enough rounds the skill grows past the point where the model can hold it all in working memory, and ironically starts following it *worse* than the original draft. This skill is the counterweight: an honest pass that asks of every line "is this still pulling its weight?"

Accretion also breeds **contradictions**: a fix bolted onto a late step can quietly conflict with a rule written for an early one, or a "see the X skill / see Step Y" pointer can lead somewhere that undercuts the instruction that sent you there. Those are the most damaging defects to leave in — the agent can't tell which instruction wins, so it guesses, and the guess is what ships. Finding and resolving them matters as much as trimming filler.

## What this skill is not

- **Not a restyle.** Don't impose a different writing style, don't introduce new conventions, don't rewrite passages just to sound different — the user's voice stays. Structural changes *are* in scope, but only to fix a real problem: reordering a prerequisite that's introduced too late, merging two sections that overlap or contradict, smoothing a jarring transition. The line is — restructure to fix a genuine readability or consistency defect, never for taste.
- **Not a feature change.** Don't add new instructions, don't broaden or narrow what the skill does, and don't fix a *workflow* bug you spot (an instruction that's simply wrong) — list those in the report instead. Resolving a *contradiction* between two existing instructions is different and **is** in scope: you're not changing what the skill does, you're making it say one thing instead of two opposing things. When the correct resolution is genuinely unclear (both sides look intentional), don't guess — pick the reading the skill's *why* supports, and flag it in the report so the user can confirm.
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

**Conflicts & flow problems** (the highest-value things to catch — fix these):
- **Contradictory instructions.** One section says do X; another says don't, or implies the opposite. The agent can't tell which wins, so it guesses. Find the correct rule, apply it everywhere the topic appears, and make every mention agree. If the two genuinely apply in *different* situations, say so explicitly at both ends so the boundary is unmistakable (e.g. "X while the stack is unsubmitted; never X once it's submitted") — an unscoped split reads as a contradiction even when it isn't.
- **Pointers that lead astray.** A "see the X skill" or "see Step Y" reference whose target contradicts or undercuts the instruction that sent you there. Either fix the target or override it explicitly at the pointer, so the reader is never handed two conflicting answers.
- **Same instruction, stated inconsistently.** Not pure duplication — two versions that actually differ in detail. Pick the right one and make both match; mismatched restatements are a silent conflict.
- **Out-of-order flow.** A prerequisite introduced after the step that needs it, a forward-reference to something defined later, an abrupt jump between sections. Reorder, or add a one-line bridge, so it reads top-to-bottom.

**Restructure candidates** — you have real latitude here. Moving a section up or down, merging two, or splitting one is fully in scope whenever it makes the skill easier to read or easier for the agent to execute. Don't leave a known flow problem in place just to preserve the existing order. Look for:
- A section that's referenced or needed before it appears — hoist it earlier so the reader hits it in the order they actually need it.
- Setup, prerequisites, or context that sits below the steps depending on it.
- Two sections covering related material that read better merged — or one section that's really two ideas that read better split.
- A long flat list that's actually two natural groups.
- An ordering that forces the reader (or the agent) to hold something in working memory across several sections before it pays off — reorder so each piece lands where it's used.

When a move clearly improves the reading or execution order, make it. Two things to respect while you do: keep every cross-reference working (a "see Step N" or a section referenced by name must still resolve after the move — fix both ends), and reorder for a genuine reading/comprehension win, never for taste. A reorder that just shuffles already-fine sections is wasted churn.

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
2. No internal cross-reference broke (a section referenced by name still exists; a step number that's referenced elsewhere wasn't renumbered; anything you moved still resolves correctly from every place that points to it).
3. The frontmatter is intact.
4. The skill still reads top-to-bottom — no orphan transitions, no "as mentioned in Step 4" pointing at a section you removed.

If anything is off, fix it before writing the report.

## The report

After the edits, produce a report. Concise but specific — the user needs to be able to skim it and immediately spot anything they disagree with so they can revert. Use this structure:

```markdown
## Cleaned: skills/<name>/SKILL.md

**Reads better because:** <one-line summary of the net effect on flow, clarity, and consistency — this is the headline>
**Size:** <before> → <after> words/lines (secondary — note it, don't lead with it; "no net reduction, and that's fine" is a valid line)

### Conflicts resolved
- <the contradiction or astray-pointer you found, with the two sections involved> — <how you reconciled it, and which rule won>
(omit this section entirely if none were found)

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
- Leaves the skill reading more smoothly top-to-bottom, with any cross-section contradictions resolved — that's the primary measure, not line count.
- Tightens wordy passages where it can do so without losing information, and leaves genuinely information-dense sections long.
- Makes mostly small, isolated edits, and freely moves, merges, or splits sections wherever that makes the skill read or execute more clearly.
- Leaves the skill's intent, voice, and triggering behavior unchanged.

A bad run:
- Chases a shorter line count by cutting information the skill needs — length was never the goal.
- Strips out "why" explanations because they look like filler.
- Removes the description field's specificity to make it "snappier" — kills triggering.
- Restructures for the sake of restructuring, or reorders sections that were already fine.
- Removes a safety guard because the skill "should already know that."
- Leaves a real contradiction in place because resolving it felt like a "feature change" — reconciling conflicting instructions is cleanup, and it's in scope.
- Produces a report that just lists line counts without per-change rationale.

If a target skill is genuinely fine, that's a successful run too. Say so and stop.
