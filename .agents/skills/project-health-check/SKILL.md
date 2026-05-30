---
name: project-health-check
description: Runs a project's scheduled health checks in order — syncing the main worktree's main branch with origin, refreshing installed skills, then triaging the Linear backlog to pick and ship a next ticket. Use when the user asks to run the project health check, do the scheduled/periodic project checks, run routine project maintenance, or when this is invoked as a recurring scheduled agent. The Linear team (name or key) to triage is provided when the skill is invoked; an optional date cutoff for ignoring stale tickets may also be provided.
---

# Project Health Check

Run the scheduled health checks for this project, in order. Each check is **independent** — if one can't complete (a tool is missing, a command fails, access is denied), report what went wrong and continue to the next check. Never let one failed check abort the rest. Post a short summary at the end covering every check.

## Inputs

These are provided when the skill is invoked — don't hardcode them:

- **Linear team** *(required for Check 3)* — the name or key of the team whose backlog to triage (e.g. a team key like `PXL`). If it wasn't provided and can't be inferred unambiguously from the project, ask once.
- **Ticket date cutoff** *(optional)* — ignore tickets created before this date. If not provided, apply no cutoff.

## Check 1 — Sync main branch with remote

In the **main worktree** (not any feature worktree), bring the local `main` branch in sync with `origin/main` via a fast-forward only. **Do this regardless of which branch the worktree is currently on or whether it's dirty** — a worktree sitting on a feature branch with uncommitted changes is the normal case, not a reason to skip. The mechanism for not disturbing in-progress work is to stash it, sync, and put everything back exactly as it was — not to bail out. A worktree that ends on the same branch it started on, with the same changes restored, has not been disturbed.

The shape of the work, which is safe and reversible throughout:

1. **Remember where the worktree started** — its current branch and whether it has uncommitted work — so you can put it back there afterward.
2. **Set the in-progress work aside** if the tree is dirty, so `main` can be checked out cleanly. Use a reversible mechanism (stashing, including untracked files); nothing should be lost.
3. **Get onto `main` and fast-forward it** to `origin/main`. If `main` has diverged so a fast-forward isn't possible, leave it untouched and note the divergence — then still finish the restore steps so the worktree ends where it started.
4. **Put the worktree back the way you found it** — return to the starting branch and reapply the set-aside work.

Restoring the work usually reapplies cleanly. In the case where the worktree started on `main` itself, the changes now reapply on top of the freshly fast-forwarded `main`, which can conflict if upstream touched the same files. **Resolve only very simple, unambiguous conflicts automatically.** For anything non-trivial or where you're not certain of the right resolution, **stop and consult the user** — keep their set-aside work preserved and intact, surface the conflict, and don't make risky edits to their uncommitted changes.

Guardrails:
- Fast-forward only — never force, reset, or rebase `main`. If it has diverged, report and move on.
- The worktree **must end on the same branch it started on**, with the same changes present — returning to the branch and reapplying the work are mandatory, not optional. Never discard set-aside work you couldn't cleanly restore.
- On success, note whether `main` moved (and to what SHA), and whether you set work aside / restored it or returned to a non-`main` branch, so the final summary is concrete.

## Check 2 — Refresh installed skills

1. Update all installed project skills to their latest versions, non-interactively: `npx skills update --project --yes`. This resolves each skill's source automatically and updates the skill files under `.agents/skills` (and the skills lock file) in place.
2. Check whether the refresh changed any skill files or the lock file (e.g. via the version-control status of those paths).
   - **If nothing changed:** note "skills already up to date" and move on.
   - **If anything changed:** create a standalone PR with just those changes — title `chore: refresh installed skills`, body listing the updated skills. This is a **plain PR** — do not run it through the `ship` stacked-PR flow. Then surface the list of updated skills and the PR link in the final summary.
3. Keep this PR completely separate from any feature work in Check 3 — separate branch, separate PR, no shared commits.

## Check 3 — Ticket triage and ship

Look at the open tickets in the provided Linear team and pick a good next ticket to work on, then hand it to the `ship` skill.

**Filter conflicts** before settling on a ticket — exclude any candidate that has:

- A dependency / `Blocked by` relation pointing at unfinished work.
- Scope overlap with another Linear issue currently `In Progress` / `In Review`.
- Overlap with any **non-stale** open PR — stale = no commits in ~14 days; treat stale PRs as abandoned and therefore not a conflict.
- A creation date before the date cutoff, if one was provided.

**Always present your proposal and wait for the user's explicit approval before any work begins** — never hand a ticket to `ship` on your own initiative, even when the choice seems obvious. Present a recommended next ticket with a one-line rationale, plus 3–5 other candidates with one-line summaries as alternatives, and stop. If there's no suitable actionable ticket at all, say so and **skip the ship** — don't force one.

Only once the user has explicitly picked or confirmed a ticket, hand it to the `ship` skill and follow that skill's workflow for the rest (worktree, stack, review, merge). `ship` owns all its own approval gates from there.

## Summary

End with a brief report covering every check:

- **Check 1** — main synced (note new SHA if it moved) or "already up to date"; if the worktree was on a feature branch or dirty, note that work was stashed, main synced, and the branch + changes restored; flag any stash-restore conflict left for the user; or report a divergence / what otherwise blocked it.
- **Check 2** — skills refreshed (list updated skills + PR link) or "already up to date"; or what blocked it.
- **Check 3** — ticket picked + current ship status; or candidates awaiting a pick; or "no actionable ticket"; or what blocked it.
- Anything that needs the user's attention.
