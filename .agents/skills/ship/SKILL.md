---
name: ship
description: Ships a Linear ticket end-to-end — selects the ticket (or reads the one the user named), optionally plans, implements in a fresh worktree, opens a Graphite stack of PRs, runs review loops, and merges after explicit user approval. Use when the user asks to "ship", "implement", or "pick up" a Linear ticket, or any end-to-end feature/bug ticket workflow. Holds the human in the loop at every approval gate.
---

# Ship

End-to-end Linear ticket → worktree → Graphite PR stack → review-agent loops → merge.

This skill is paired with the `ticket` skill. Normally a Linear ticket already exists; this skill picks one up. If the user wants to ship something with no ticket yet, read the `ticket` skill and follow its workflow to create one before continuing.

## Required tools

- **Linear MCP** — to read tickets, list issues, change status, and post comments.
- `gt` (Graphite) — PR stack
- `gh` (GitHub CLI) — PRs and review-agent comments

If any is missing, stop and ask.

## Approval gates

The agent never advances past these without explicit user confirmation ("yes", "approved", "merge", etc.). Permission does not carry over between gates.

| #   | Gate           | When                                                                    |
| --- | -------------- | ----------------------------------------------------------------------- |
| 1   | Task selection | Only when the ticket is ambiguous or conflicts (Step 1)                 |
| 2   | Plan approval  | Only when the ticket asks for it (Step 2)                               |
| 3   | Stack breakup  | Always, after implementation, before splitting into the stack (Step 5c) |
| 4   | Merge          | Always, before merging any PR in the stack                              |

## Progress checklist

Copy this into the response and tick as work progresses:

```
- [ ] 1. Select ticket
- [ ] 2. Read ticket; decide plan-first vs. straight-to-implement
- [ ] 3. Plan (if required) — approved
- [ ] 4. Worktree + branch
- [ ] 5a. Implement end-to-end on the working branch (no stack yet)
- [ ] 5b. Deslop the working tree
- [ ] 5c. Review the full diff; propose stack breakup — approved
- [ ] 5d. Split the implemented changes into the Graphite stack
- [ ] 6. Submit stack; review loop per PR until clean or user-approved
- [ ] 7. User merge signal → generate migrations; merge bottom-up
- [ ] 8. Linear → Done; clean up worktree; report
```

## Linear progress log

Post a short comment to the Linear ticket via the Linear MCP at each milestone below. Comments are status entries, not transcripts — one or two lines plus links. Avoid logging chat-level back-and-forth.

| Milestone                           | Comment content                                      |
| ----------------------------------- | ---------------------------------------------------- |
| Work started (Step 4)               | branch + worktree created; "starting implementation" |
| Plan posted (Step 3, if applicable) | link or paste of the plan, awaiting approval         |
| Stack breakup approved (Step 5c)    | the approved breakup                                 |
| Stack submitted (Step 6)            | list of PR URLs                                      |
| Review round complete (Step 6)      | "round N: X findings, Y fixed, Z skipped" + outcome  |
| Merge complete (Step 7)             | merged PR URLs in order                              |

## Linear status transitions

Move the ticket via the Linear MCP at each transition below. The workspace's available state names vary — look them up via the MCP and pick the closest semantic match.

| When                                               | New status    |
| -------------------------------------------------- | ------------- |
| Step 2 (committing to work the ticket)             | `In Progress` |
| Step 6 (stack submitted, awaiting review/approval) | `In Review`   |
| Step 6 (fixing review findings — back on the work) | `In Progress` |
| Step 7 (final merge complete)                      | `Done`        |

If the chosen state doesn't exist, ask the user once which equivalent to use and remember the mapping for the rest of the run.

---

## Step 1 — Select ticket

**Scope to the current project's Linear team.** List the workspace's teams and pick the one whose name / key / linked GitHub repo matches the current project directory. If the match is ambiguous, ask the user once and remember the mapping for the rest of the run. All ticket lookups, listings, and status changes in this run go against that team only.

If the user referred to a specific ticket (by name, phrase, or id), find it within that team via the Linear MCP. Otherwise, surface a shortlist of actionable tickets (states resembling `Todo` / `Backlog`; exclude `Blocked`) from that team for the user to pick from.

Either way, **filter conflicts** before settling on the ticket:

- Dependency / `Blocked by` relations pointing at unfinished work.
- Scope overlap with any other Linear issue currently `In Progress` / `In Review`.
- Overlap with any **non-stale** open PR — `gh pr list --state open --json number,title,updatedAt,headRefName,labels`. Stale = no commits in ~14 days; treat stale PRs as abandoned.

**Only stop for user input when there's genuine ambiguity.** If the user named a specific ticket and no blocking conflicts surfaced, **proceed directly to Step 2** — don't ask for redundant confirmation. Stop only when:

- No ticket was specified, or
- The user's phrase matches more than one candidate, or
- The chosen ticket has a real conflict (unfinished dependency, scope overlap with an in-flight ticket, or a non-stale open PR on the same area).

In any of those cases, present 3–5 candidates with one-line summaries (or surface the specific conflict) and wait for the user to pick or resolve.

## Step 2 — Read ticket; decide path

Read description, comments, attachments, status.

- **Plan-first?** If the ticket explicitly asks for human plan approval ("plan first", "approve plan", "review plan before implementing"), do Step 3. Otherwise skip it.
- **Resume?** If a worktree or branch already exists for this ticket, resume there.

Apply the Step 2 status transition (see table above).

## Step 3 — Plan (only if required)

Post a concise, high-level plan of **how the feature will be implemented**: the approach, the major steps to take, key technical decisions, anything ambiguous in the ticket that needs the user's call, and how it'll be verified. Do **not** break it into PRs here — the stack breakup happens later in Step 5c after reading the code.

Wait for explicit approval before proceeding.

## Step 4 — Worktree + branch

**First check the current working directory.** The agent is most likely already running inside a freshly-prepared worktree (the harness often spawns it that way). If so — clean working tree, no other in-flight ticket bound to this branch — just use it. Don't create a new worktree on top.

If the current directory is **not** already a usable worktree (e.g. it's the main repo checkout, or it has unrelated uncommitted work), create a fresh worktree off `origin/main` for this ticket.

In either case, ensure Graphite tracking is initialized against `main` before continuing. All subsequent work happens inside whatever worktree you settled on.

**Branch name (when creating a new branch):** `<agent-name>/<short-slug>` (e.g. `<agent>/feed-pagination`). The agent-name prefix is whatever names this local agent — it namespaces concurrent agents working in the same repo so they don't collide. Don't put the Linear id in the branch name; it goes in the PR body via `Closes <LINEAR-ID>`. If you're reusing an existing worktree, keep its current branch name regardless of whether it matches this convention — don't rename.

## Step 5 — Implement, then split into a stack

The PR stack is a **post-hoc** organization of the work, not a prediction of it. A lot is discovered during implementation; trying to plan the stack up front is brittle. So: implement freely first, then look at the diff and group it.

### 5a. Implement end-to-end on the working branch

Read affected code as needed and implement the full feature on the single working branch from Step 4. **Do not commit during implementation** — keep all changes in the working tree. Iterate until lint/typecheck/tests pass against the uncommitted state.

**Hold migrations.** Don't generate migration files yet (Prisma `migrate dev`, Drizzle `drizzle-kit generate`, Rails `db:migrate`, Django `makemigrations`, etc.). Schema source files (`prisma/schema.prisma`, `db/schema.ts`, etc.) can change freely; numbered migrations are generated at merge time (Step 7) so they don't collide with parallel work.

### 5b. Deslop the working tree (only if the `deslop` skill is present)

If a `deslop` skill is available, run it against the working tree before reviewing the diff or splitting the stack. It removes AI-generated code patterns (unnecessary comments, defensive overkill, type escape hatches, single-use variables, separate prop interfaces, style drift) so reviewers see clean code on the first push instead of patterns that will inevitably show up as review-agent findings later. Cleaning here once is cheaper than fixing the same things across N PRs in the review loop.

Re-run lint/typecheck/tests after deslop in case the cleanup touched anything that needs verification.

If the skill isn't installed in this environment, skip this step — don't attempt to deslop manually, and don't block the workflow on it.

### 5c. Review the full diff; propose stack breakup (gate)

Inspect the working-tree diff against `main` (e.g. `git diff main --stat`, then read the changes including untracked files via `git status`). Group similar functionality into a thorough-but-concise stack proposal the user can read in seconds. One bullet per branch, in stack order. Each: branch slug, one-line summary, scope (small/medium), key files. Pattern: refactors → scaffolding → behavior → UI → tests.

```md
**Proposed PR stack** (4 PRs, bottom → top)

1. `<agent>/feed-loader-refactor` (small) — extract `useFeedLoader`. Files: `app/feed/feed.tsx`, new `app/feed/use-feed-loader.ts`.
2. `<agent>/feed-pagination-types` (small) — `Cursor` type + DB helper. Files: `lib/db.ts`, `lib/feed-types.ts`.
3. `<agent>/feed-pagination-server` (medium) — server action + cursor query. Files: `app/feed/actions.ts`, schema additions (migration deferred).
4. `<agent>/feed-pagination-ui` (medium) — wire infinite scroll + tests. Files: `app/feed/feed.tsx`, `__tests__/feed.test.tsx`.
```

Wait for explicit approval. The user may split, merge, or reorder — adjust and re-show. No splitting begins until approved.

### 5d. Split the implementation into the Graphite stack

Replay the working-tree changes onto a clean Graphite stack so each branch contains exactly the slice approved in 5c:

1. **Preserve the implemented end state first** — the implementation is uncommitted and losing it costs the whole feature. Simplest options: `git stash --include-untracked`, or make a single snapshot commit on a parked branch (e.g. `git checkout -b <branch>-snapshot && git add -A && git commit -m "snapshot"` then return to the working branch).
2. **Reset back to `main`** and build the stack branch by branch via Graphite. For each branch, apply only the slice of the diff that belongs on that branch (e.g. selective patch application from the snapshot).
3. **Each branch must pass lint/typecheck/tests on its own**, with its parent branch in the stack as the base (not `main`). Each PR is reviewed and CI'd against its parent — Graphite restacks children onto `main` only as parents merge. So slice the work so every branch is self-contained relative to the stack: types, scaffolding, and dependencies introduced before the code that uses them. **Don't use `--no-verify`** — if a branch can't pass hooks, the slice is wrong; rework the breakup. This may mean re-proposing 5c to the user.
4. **Confirm equivalence at the end.** The cumulative diff of the top branch against `main` must match the preserved end state exactly: `git diff <top-branch> <snapshot>` should be empty. If it isn't, the split is wrong — fix before submitting.

## Step 6 — Submit stack; review loop

The review agent runs **remotely on the PR** — it's a GitHub-side bot that reads the PR's diff and posts findings as PR comments. The local agent does not run the review; it only waits for the remote agent to post and then reads its comments via `gh`.

The active review agent for this project is **Codex** — the agent-specific bindings (latency, author name, retrigger command) live inside the loop below. To swap in a different review agent later, change only those bindings.

Submit the stack via Graphite — one PR per branch, each opened as **ready for review** (not draft). Only fall back to draft if the user explicitly asks, or if something genuinely blocks the PR from being reviewable (e.g. a known-broken intermediate state the user wants to share for context). PR creation auto-triggers a review on each new PR.

For **each PR** (bottom-up), run this loop until either the review agent returns no actionable findings **or** the user gives a merge signal (Step 7) — whichever comes first:

1. **Wait for the review** to post. Latency is agent-specific — for Codex, ~6–7 min is typical. If the harness exposes a periodic-watcher mechanism (recurring scheduled check, polling loop, cron-style wake), set one up to fetch the PR's comments at that cadence and surface anything new from the review agent or from a user PR review/approval (Step 7). Otherwise fall back to a single delayed wake (e.g. `ScheduleWakeup` at ~400s, kept under the prompt-cache TTL) and re-arm after each fetch. The watcher should also catch a user `APPROVED` review submitted at any time, so the agent reacts to a merge signal without the user having to repeat it in chat.

   **Watcher lifecycle:** create the watcher once, when the stack is first submitted in Step 6. Keep it running across all PRs and rounds. **Tear it down** as soon as the loop terminates — i.e. when every PR in the stack is clean (no open findings + 👍 from the review agent or user approval) **or** the user has given a merge signal (Step 7), and the agent is moving on to merge / cleanup. Also tear it down on any abnormal exit (user cancels, error path) so it doesn't keep firing in the background.

2. **Fetch comments and PR-description reactions**:
   ```bash
   gh pr view <num> --json comments,reviews
   gh api repos/{owner}/{repo}/pulls/<num>/comments --paginate
   gh api repos/{owner}/{repo}/issues/<num>/reactions    # reactions on the PR body itself
   ```
3. **Extract review findings and clean-bills.**
   - **Findings** — for Codex, comments authored by `chatgpt-codex-connector` / `codex` or matching its summary format.
   - **Clean bill of health** — some review agents react with a 👍 (`+1`) on the PR description when they find no issues. For Codex, a `+1` reaction on the PR body authored by the review agent means "no findings on this PR." Treat this as the clean signal for the PR.
4. **Triage each finding** into one of:
   - **Fix** — real bug, correctness issue, security issue, or other clear defect.
   - **Skip** — nit, style-only, false positive (the reviewer misread the code), already handled, or overly-defensive (adds complexity for scenarios that won't realistically occur — redundant null checks on framework-guaranteed values, error handling for impossible states, excessive validation on internal-only paths).

   When in doubt, lean toward Skip. The goal is to fix real bugs, not gold-plate the code.

5. **Triage autonomously and report — no user gate.** The agent decides Fix vs. Skip on each finding itself and proceeds to fix the valid ones (point 6) without waiting for confirmation. A status message is still posted so the user has visibility and can interject if they disagree. Format:
   - **Context header** at the very top: ticket id + title, a one-line summary of what this stack is shipping, and a compact list of the PRs (slug + URL). The user shouldn't need to open anything to recall the scope.
   - **Per-PR review status**: for each PR, one of `clean` (review agent reacted 👍 on the PR body), `findings: N` (with N findings to address this round), `awaiting review`, or `re-review pending` (after a retrigger).
   - **Findings this round** with the agent's autonomous Fix/Skip decision + one-line reason + source link. New-this-round and carried-over both shown for clarity. Skip findings appear once and are not carried forward.
   - **Next action**: "fixing the N valid findings now and retriggering review" (or "no actionable findings — waiting for next watcher tick").

   Don't wait — proceed straight to point 6. The user can still short-circuit the whole loop at any time via a chat merge signal or a GitHub `APPROVED` review (see Step 7).

6. **Fix the valid findings** (those the agent classified as Fix in point 5) on the relevant branch. **Each finding gets its own commit** — don't batch multiple finding fixes into a single commit, and don't amend into prior commits. One finding → one focused commit with a message that references the finding it addresses. After each commit, push (don't force-push aside from what Graphite does for restacking). Use whatever Graphite-aware flow preserves the per-finding commit granularity — the Graphite skill knows the current commands.
7. **Retrigger the review** (most agents only auto-review the first push). For Codex:
   ```bash
   gh pr comment <num> --body "@codex review"
   ```

If a finding spans multiple PRs, fix on the lowest PR that owns the code so children inherit it when the stack is restacked and resubmitted.

## Step 7 — Merge (gate)

Merge-ready when the user gives an explicit merge signal — either:

- said `merge` / `approved` / `ship it` / equivalent in chat, **or**
- submitted an `APPROVED` PR review on any PR in the stack via GitHub. Detect with:
  ```bash
  USER=$(gh api user --jq '.login')
  gh pr view <num> --json reviews \
    --jq ".reviews[] | select(.author.login == \"$USER\" and .state == \"APPROVED\")"
  ```
  Poll the stack's PRs alongside review-agent comments in Step 6.

The user signal is sufficient on its own — unresolved review-agent findings do not block merge once the user has explicitly approved (the user has seen them and chosen to ship anyway). A clean review without an explicit user signal is **not** enough.

When approved:

1. **Generate migrations** if the schema source changed. Use the project's standard generator in **create-only / generate** mode — never apply to the connected DB without explicit user approval. Commit the generated file onto the schema-owning PR, then resubmit the stack.

   Then assess whether applying the migration **before** merging makes sense (e.g. the new code expects the schema and would break in shared environments otherwise; or the migration carries non-trivial transformations worth dry-running first). If yes, ask the user to confirm applying. **Block the merge until the user explicitly approves or declines applying.** If approved, apply via the project's standard apply command. If declined, proceed to merge with the migration file committed but unapplied.

2. **Merge bottom-up via Graphite.** Merge the trunk-most PR first; Graphite restacks descendants automatically so each subsequent PR's base becomes `main`. Repeat until the stack is empty.
3. **Apply the final Linear status transition** (see table above) and post the merge-complete log comment (see log table above).
4. **Clean up local branches.** Prune branches that were merged into `main` (Graphite has a sync command for this). Then remove any leftover local branches that are no longer needed.
5. **Clean up the worktree — conditionally.** Only remove it if the agent **created** it in Step 4. If the agent **reused** an existing worktree (the harness provided it), **leave it alone** — the harness owns that worktree's lifecycle and will tear it down itself.
   ```bash
   # Only if the agent created the worktree in Step 4:
   cd <repo-root>
   git worktree remove <path>
   ```
6. **Tear down the review watcher** if still running (see Step 6 watcher lifecycle).

## Step 8 — Report

Short summary: ticket id, merged PR URLs, review findings skipped + reasons.

---

## Rules

- No AI attribution in commits, PR titles, or PR bodies.
- No force-push outside what Graphite does for restacking.
- No `--no-verify` unless the user asks.
- Review-finding fixes always land as separate commits on the PR branch — never amend or fold them back into the original commit unless the user explicitly asks to squash.
- If the plan turns out wrong mid-implementation, stop and re-confirm with the user.
- If Linear MCP is unreachable mid-flow, surface the would-be status change in chat and ask the user to update Linear.
- PR titles use conventional commits (`feat(scope): …`). PR bodies include `Closes <LINEAR-ID>` so Linear auto-closes on merge.
