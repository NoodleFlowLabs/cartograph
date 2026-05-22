---
name: project-health-check
description: Runs a project's scheduled health checks in order — refreshing installed skills, then triaging the Linear backlog to pick and ship a next ticket. Use when the user asks to run the project health check, do the scheduled/periodic project checks, run routine project maintenance, or when this is invoked as a recurring scheduled agent. The Linear team (name or key) to triage is provided when the skill is invoked; an optional date cutoff for ignoring stale tickets may also be provided.
---

# Project Health Check

Run the scheduled health checks for this project, in order. Each check is **independent** — if one can't complete (a tool is missing, a command fails, access is denied), report what went wrong and continue to the next check. Never let one failed check abort the rest. Post a short summary at the end covering every check.

## Inputs

These are provided when the skill is invoked — don't hardcode them:

- **Linear team** *(required for Check 2)* — the name or key of the team whose backlog to triage (e.g. a team key like `PXL`). If it wasn't provided and can't be inferred unambiguously from the project, ask once.
- **Ticket date cutoff** *(optional)* — ignore tickets created before this date. If not provided, apply no cutoff.

## Check 1 — Refresh installed skills

1. Update all installed project skills to their latest versions, non-interactively: `npx skills update --project --yes`. This resolves each skill's source automatically and updates the skill files under `.agents/skills` (and the skills lock file) in place.
2. Check whether the refresh changed any skill files or the lock file (e.g. via the version-control status of those paths).
   - **If nothing changed:** note "skills already up to date" and move on.
   - **If anything changed:** create a standalone PR with just those changes — title `chore: refresh installed skills`, body listing the updated skills. This is a **plain PR** — do not run it through the `ship` stacked-PR flow. Then surface the list of updated skills and the PR link in the final summary.
3. Keep this PR completely separate from any feature work in Check 2 — separate branch, separate PR, no shared commits.

## Check 2 — Ticket triage and ship

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

- **Check 1** — skills refreshed (list updated skills + PR link) or "already up to date"; or what blocked it.
- **Check 2** — ticket picked + current ship status; or candidates awaiting a pick; or "no actionable ticket"; or what blocked it.
- Anything that needs the user's attention.
