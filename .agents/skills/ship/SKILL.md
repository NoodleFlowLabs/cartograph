---
name: ship
description: Ship changes as a PR (or Graphite stack) with an interactive review loop. Entry can be anything - changes already sitting in the working tree, a Linear ticket to implement, or just a plain-text description of what to build. Implements if needed, split into a stack, then loops on review findings - always confirming with the user which findings to fix before fixing them. Stops when everything is green; merging is the user's call. Use when the user says "ship", "ship these changes", "ship FOO-123", "open a PR for this", or describes a change and wants it shipped.
---

# Ship

Take something — existing changes, a ticket, or just a description — and get it onto a clean, reviewed PR stack. Stop when it's green. The user merges on their own time.

The whole skill runs on two habits: keep the user in the loop on judgment calls (which review findings to fix, how to split complex work), and handle the mechanical parts yourself.

## What's being shipped

The invocation tells you. Three flavors:

- **Changes already exist locally** — the working tree is the implementation. Skip straight to deslop + stack.
- **A Linear ticket is referenced** — read it via the Linear MCP to understand what to build. The ticket is just the spec here: read it, build it, done. Leave the ticket itself alone (status, comments, assignee) unless the user asks. If the invocation references Linear and the Linear MCP isn't available, stop and tell the user — don't guess at the ticket's contents.
- **A plain-text ask** — the prompt itself describes the change. Just build it.

One special case: if the working tree holds a skeleton from the `probe` skill (stub files sketching the change's load-bearing decisions — schema, interfaces, signatures, module layout), that skeleton is the **agreed architecture** — the user already reviewed it, possibly after shaping the whole thing with `advisor` first (`advisor` → `probe` → `ship` is the pipeline for very complex changes). Fill in the details on top of it; don't redesign the shape it laid down, and raise it explicitly if implementation genuinely forces a deviation.

## Tools

Nothing is strictly required. Linear MCP, Graphite (`gt`), and `gh` all help, but work with what's installed:

- No `gt` → single PR (or plain git branches) instead of a stack.
- No `gh` → push the branch and give the user a compare URL; the review loop obviously needs `gh`, so tell them it's off.
- Linear MCP only matters when the invocation actually references a ticket (see above).

## Implementing (when the code isn't written yet)

Don't draft a plan first — just build. If something is genuinely ambiguous, ask; otherwise trust your read of it.

Work in a fresh worktree off `main` unless you're already sitting in one (harness-provided worktrees count — use them, don't nest). Implement the whole thing end-to-end on one working branch, uncommitted, until lint/typecheck/tests pass — and actually exercise the behavior if it's observable, don't let green lint stand in for "it works".

Then run the `deslop` skill on the working tree if it's installed (skip silently if not).

## Splitting into a stack

Look at the full diff and propose a breakup:

- Slice by functionality, not code shape — each PR should deliver something observable on its own. Helpers ride with their first caller; no scaffolding-only PRs.
- **Gate on the user only when it's warranted**: complex work (multiple subsystems, auth/schema/payments, new architecture) or an ambiguous ask where they should sanity-check your interpretation. Bounded work with an obvious shape → post the proposal as an FYI and keep moving. When unsure, gate.

Then split: snapshot the end state, rebuild branch by branch, each branch passing checks against its parent, cumulative diff matching the snapshot exactly. If there's no Graphite, one PR is fine — don't force a stack.

## Creating PRs

- **Always ready-for-review, never draft.** Drafts just stall the auto-review. (Watch out for `gt submit --no-interactive` — it defaults to draft, so pass `--publish`.)
- **Title**: conventional commits (`feat(scope): …`). **Body**: short — what changed and why, enough for a reviewer to orient.
- **Before/after screenshots for anything user-visible.** They go in the PR body itself, not just the chat — the PR is where reviewers look. Capture the *after* from the actually-running app; capture the *before* from the PR's own base branch (its parent in the stack — using `main` for a stacked child would smuggle the parent's changes into the comparison).
  - If the page sits behind a login, use the user's own browser session (drive their signed-in browser via the browser tools) rather than creating test users or hacking around auth. If that's not available, ask — don't declare it blocked.
  - If the view renders empty just because there's no data, mock some data for the shot, then revert the mock so it never reaches the diff.
  - Embed as GitHub attachment URLs (`user-attachments/...`), not files committed to the branch — repo links don't render reliably in PR bodies and throwaway images bloat the diff. After editing, double-check the images actually render.

## Review loop (interactive — this is the important part)

Codex reviews the PRs remotely. **Only Codex** — ignore CodeRabbit, Greptile, and any other bot entirely. Don't triage their comments, don't reply to them, don't let them block anything.

**How to read Codex's signals.** Codex starts a review automatically when a PR is created — no need to tag it for the first round. Its status shows up as reactions:

- 👀 on the PR description = review in progress. (On retriggered rounds, the 👀 also lands on the comment that triggered it.)
- Findings → it posts a review comment and removes the 👀.
- Clean → it posts 👍 on the PR description instead (and sometimes on the triggering comment). 👍 with no new comment means "no findings" — that's the clean bill for the round.

The loop, per round:

1. **Wait for findings.** Codex takes ~6–7 minutes, so schedule a check-in around then (ScheduleWakeup or whatever the harness gives you) rather than blocking or making the user ping you. On each check-in, read the signals above — reactions on the PR description (and triggering comment) plus any new Codex comments — to tell in-progress / findings / clean apart.
2. **Report, don't fix.** When findings land, print them for the user. For each finding give:
   - A link to the finding.
   - **What it's about, in plain terms** — explain the issue simply, without assuming the user has the diff in their head. No reviewer-speak.
   - **How the user would experience it** (when applicable) — what actually goes wrong from their perspective if it ships: what they'd see, what would break, when it would surface. If it's invisible to users (style, internal robustness), say that instead.
   - **What the fix would look like** — brief: is it a trivial one-liner or a more involved change, and roughly how it'd be done ("add a null check before the lookup", "restructure the handler to await the write before responding").
   - Your honest take on whether it's valid — Fix or Skip with a one-liner why (see "Judging findings" below).

   Then **wait**. Never fix a finding without the user saying which ones to fix — not even the obviously-valid ones.
3. **Act on the user's picks.** The default is fix-and-push: "fix it", "fix 1 and 3", or any plain approval means commit and push the fixes as new commits (never amend or force-push — the user reviews the PR commit by commit, and rewritten history destroys that), reply on each finding's thread ("Fixed in `<sha>`" for fixes, "Skipping: `<reason>`" for the rest), update the PR description with the skips (step 4), and retrigger the review (step 5). Every Codex comment gets closed out one way or the other — nothing left hanging.

   The exception is when the user explicitly says **"locally"** — "fix it locally", "fix locally first" — which means: make the fixes in the working tree only, no commits, no pushes. They want to eyeball the fix before it touches the PR. Show them what changed and wait; a later "push it" (or similar) graduates the local fixes to the PR via the same fix-and-push sequence above.

4. **Record the skips in the PR description.** Keep an `## Explicit skips` section at the bottom of the body — one bullet per skipped finding with the reason. This is what stops the next round from re-flagging the same thing, so write the reason for the reviewer, not for the user.
5. **Retrigger the review** (`@codex review`) and schedule the next ~7-minute check-in. New findings → back to step 2, same rules: report, wait for the user, then act.

Also keep CI green throughout — treat a red check like a finding you can fix without asking (it's not a judgment call, it's broken).

**Done when**: all checks green, no unaddressed Codex findings, every finding either fixed or explicitly skipped. Say so and stop — the PRs are the deliverable, and merging is the user's call on their own time.

## Judging findings

When you report findings, give the user a real opinion, and calibrate it to what this product actually is. Most of what goes through this skill is MVP-stage: few or no users, no data in the old shape, no external API consumers. Reviewers don't know that — they flag as if everything is a mature multi-tenant system.

So before calling a finding valid, ask what it implicitly assumes and whether that holds here:

- **Backward compat / "this is a breaking change"** — if there's no existing usage, no persisted data in the old shape, and no external callers, the right move is a clean break. Shims, dual-writes, deprecation windows, and data migrations for data that doesn't exist are complexity with no payoff. Lean Skip. But if you _can't_ confidently establish there's no existing usage (populated table, shipped feature, public API), say so and let the user decide — don't assume it away.
- **Scale/concurrency the product won't hit** — race guards on single-user flows, advisory locks against a double-click, rate limiting on internal endpoints. Lean Skip.
- **Deploy shapes the project doesn't have** — code-runs-before-migration windows, cross-version rolling-deploy traffic on a single-instance app. Lean Skip.
- **Real bugs** — actual correctness, security, or data-loss issues that would bite at the current scale. Lean Fix.
- **Fix cascades** — if a finding only exists because an earlier defensive fix created the window it guards, the whole chain is probably skippable.

Present each finding as Fix or Skip with a one-liner why, but remember: it's a recommendation. The user makes the call.

## Rules

- Never force-push, never amend published commits — fixes are always new commits on top.
- Never open PRs as drafts.
- No AI attribution in commits or PR bodies.
- Before/after screenshots in the PR body for anything user-visible.
- Tear down any scheduled check-ins when the loop finishes or the user bails.
