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

| #   | Gate                 | When                                                                                |
| --- | -------------------- | ----------------------------------------------------------------------------------- |
| 1   | Task selection       | Only when the ticket is ambiguous or conflicts (Step 1)                             |
| 2   | Plan approval        | Only when the ticket asks for it (Step 2)                                           |
| 3   | Missing dependencies | Only when the ticket requires deps/services not already set up in the repo (Step 2) |
| 4   | Stack breakup        | Only when the work is complex or the ticket was ambiguous (Step 5c)                 |
| 5   | Merge                | Always, before merging any PR in the stack                                          |

## Progress checklist

Copy this into the response and tick as work progresses:

```
- [ ] 1. Select ticket
- [ ] 2. Read ticket; decide plan-first vs. straight-to-implement
- [ ] 2b. Verify required dependencies are present — flag any missing (gate)
- [ ] 3. Plan (if required) — approved
- [ ] 4. Worktree + branch
- [ ] 5a. Implement end-to-end on the working branch (no stack yet)
- [ ] 5b. Deslop the working tree
- [ ] 5c. Review the full diff; decide whether to gate; if gating, generate the brief (DRAFT mode) + propose stack breakup — approved
- [ ] 5d. Split the implemented changes into the Graphite stack
- [ ] 6. Submit stack; per-PR loop until checks green + review clean (or user-approved)
- [ ] 6e. Review complete → generate the brief (FINAL mode)
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
- **Resume vs. restart?** If a worktree, branch, or open PR stack already exists for this ticket, **do not silently resume**. Resuming abandoned work and restarting live work are both costly mistakes — the wrong default has burned full implementation sessions in the past. Inspect what exists first: is the worktree on disk with recent uncommitted/committed work? Does the branch have a meaningful diff against `main`? Are the PRs in the stack still in active review? If the answer is yes on all counts and the user's prompt is consistent with continuing (no "ignore previous", no "start over"), resume there. Otherwise — branch with no diff, worktree gone, PRs gone stale, or any signal the prior attempt was abandoned — surface a one-line inventory of what was found (branch name, last commit timestamp, PR URLs and states) and ask the user once whether to resume or start fresh. An explicit user override in the prompt ("ignore the previous attempt", "continue where we left off") is sufficient on its own and skips the question.

Apply the Step 2 status transition (see table above).

## Step 2b — Verify required dependencies (gate)

Before any implementation (and before Step 3 if planning), enumerate the **external dependencies and one-time setup** the ticket requires: SDKs / npm packages, framework primitives that need installation (e.g. cron, queues, workflows, auth providers), managed services that need provisioning (databases, vector stores, third-party APIs), environment variables, and infra config (e.g. `vercel.ts`, `vercel.json` entries, cron schedules).

For each, check whether it's **already present** in the repo:

- Package installed in `package.json` / lockfile?
- Setup files in place (e.g. cron defined in `vercel.ts`/`vercel.json`, workflow runtime configured, env keys in `.env.example`)?
- Service provisioned and credentials available?

**Stop and ask the user** if anything required is missing. Do **not** install packages, add cron schedules, provision marketplace integrations, or modify project-level config (`vercel.ts`, `package.json` deps, `.env.example`, etc.) as part of this skill's run — the user wants to handle these manually. Report the gap as a short bulleted list and wait for the user to either:

- install/set up the dependency themselves and tell you to proceed, or
- explicitly authorize you to install/configure it as part of the ticket, or
- redirect (descope the ticket, pick a different approach that uses existing deps, etc.).

Only proceed once every required dependency is in place or the user has explicitly authorized the missing setup. Tickets should consume existing infrastructure; new infrastructure is the user's call.

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

**Lint, typecheck, and tests passing means the code is well-formed — not that the feature works.** For a change with observable behavior — a UI interaction, a rendered view, an endpoint's response — actually exercise it: drive the route, render the component, call the endpoint, and confirm it does what the ticket asked. When you can't reach the behavior — the route sits behind auth and the dev session bounces you to `/`, the change needs data you haven't seeded, an external service isn't wired up — don't quietly let a green lint stand in for verification. Either get past the blocker or tell the user plainly what you couldn't verify and why, so they can confirm it before merging. For an auth wall specifically, **prefer the user's already-authenticated browser session** — drive their signed-in Chrome profile via browser automation rather than an anonymous session — before settling for "auth blocks verification"; other blockers, seed the data or add a focused test that exercises the behavior directly. Don't create users, bypass auth, or add temporary auth code to get a screenshot; if the authenticated-session path isn't available, ask the user for it rather than working around auth. A UI change that lints clean but was never run looks finished and reaches review broken — which is how it comes back as a review finding or a post-merge surprise.

**Hold migrations.** Don't generate migration files yet (Prisma `migrate dev`, Drizzle `drizzle-kit generate`, Rails `db:migrate`, Django `makemigrations`, etc.). Schema source files (`prisma/schema.prisma`, `db/schema.ts`, etc.) can change freely; numbered migrations are generated at merge time (Step 7) so they don't collide with parallel work.

### 5b. Deslop the working tree (only if the `deslop` skill is present)

If a `deslop` skill is available, run it against the working tree before reviewing the diff or splitting the stack. It removes AI-generated code patterns (unnecessary comments, defensive overkill, type escape hatches, single-use variables, separate prop interfaces, style drift) so reviewers see clean code on the first push instead of patterns that will inevitably show up as review-agent findings later. Cleaning here once is cheaper than fixing the same things across N PRs in the review loop.

Re-run lint/typecheck/tests after deslop in case the cleanup touched anything that needs verification.

If the skill isn't installed in this environment, skip this step — don't attempt to deslop manually, and don't block the workflow on it.

### 5c. Review the full diff; propose stack breakup (conditional gate)

Inspect the working-tree diff against `main` (e.g. `git diff main --stat`, then read the changes including untracked files via `git status`). Group similar functionality into a thorough-but-concise stack proposal. One bullet per branch, in stack order. Each: branch slug, one-line summary, scope (small/medium), key files.

**Slice by functionality, not by code shape.** Each PR should deliver an observable piece of the feature on its own. Helpers, types, and shared utilities ride along with the **first PR that uses them** — don't create a slice whose only content is plumbing for a later PR (e.g. "add X type", "extract Y helper for upcoming feature", "scaffolding for Z enforcement"). A standalone *refactor* PR is fine when the refactor itself is the deliverable (e.g. extracting an existing hook for reuse, renaming a module, splitting a file that's already overloaded) — but a *scaffolding* PR that only exists to make the next PR smaller is the wrong split. If you find yourself proposing "Account Helpers" → "Account Enforcement" → "Account UI," collapse them: the helpers land with whichever functional slice first calls them.

```md
**Proposed PR stack** (3 PRs, bottom → top)

1. `<agent>/feed-loader-refactor` (small) — extract `useFeedLoader` (refactor is the deliverable, not setup for later PRs). Files: `app/feed/feed.tsx`, new `app/feed/use-feed-loader.ts`.
2. `<agent>/feed-pagination-server` (medium) — server action + cursor query; `Cursor` type and DB helper land here because this is where they're first used. Files: `lib/db.ts`, `lib/feed-types.ts`, `app/feed/actions.ts`, schema additions (migration deferred).
3. `<agent>/feed-pagination-ui` (medium) — wire infinite scroll + tests. Files: `app/feed/feed.tsx`, `__tests__/feed.test.tsx`.
```

**Decide whether to gate.** The stack-breakup gate is **not always on** — it exists for cases the user genuinely needs to review before code is split and shipped. Use judgment along two axes:

- **Complexity** — does the change touch multiple subsystems, introduce new architecture/patterns, alter data flow, or carry non-trivial risk (auth, schema, payments, public API surface)? Or is it bounded — a focused bug fix, a small feature, a refactor inside one module?
- **Ambiguity** — did the ticket prescribe the approach (clear acceptance criteria, one obvious implementation path)? Or did it leave significant decisions open (multiple viable approaches, vague scope, design calls that aren't spelled out)?

Gate when **either** axis is high: complex work, or ambiguous tickets where the user should sanity-check the interpretation before PRs go up. Skip the gate when the work is bounded **and** the ticket prescribed the approach — in that case go straight to 5d. Don't reduce this to PR count; a 3-PR refactor inside one module can be auto-go, a 1-PR change to auth middleware should gate.

If unsure, gate — the cost of a quick approval is small; the cost of an unwanted stack is large.

**If gating:**

- Generate the visual brief — invoke the `brief` skill if it's installed. It auto-detects DRAFT mode from the working-tree state and produces a visual HTML one-pager for fast approval.
- Always include the full stack proposal as text in the response, whether or not the brief was generated — the brief is a supplement. When `brief` is installed, also give the brief's path.
- Wait for explicit approval. The user may split, merge, or reorder — adjust and re-show. No splitting begins until approved.

**If skipping the gate:**

- **Do not** invoke `brief` here — the FINAL-mode brief generated at Step 6e is sufficient when the user hasn't been asked to pre-approve the stack.
- Post the stack proposal as a brief informational note (so the user can still interject), then proceed straight to 5d without waiting.

### 5d. Split the implementation into the Graphite stack

Replay the working-tree changes onto a clean Graphite stack so each branch contains exactly the slice approved in 5c:

1. **Preserve the implemented end state first** — the implementation is uncommitted and losing it costs the whole feature. Simplest options: `git stash --include-untracked`, or make a single snapshot commit on a parked branch (e.g. `git checkout -b <branch>-snapshot && git add -A && git commit -m "snapshot"` then return to the working branch).
2. **Reset back to `main`** and build the stack branch by branch via Graphite. For each branch, apply only the slice of the diff that belongs on that branch (e.g. selective patch application from the snapshot).
3. **Each branch must pass lint/typecheck/tests on its own**, with its parent branch in the stack as the base (not `main`). Each PR is reviewed and CI'd against its parent — Graphite restacks children onto `main` only as parents merge. So slice the work so every branch is self-contained relative to the stack: types, scaffolding, and dependencies introduced before the code that uses them. **Don't use `--no-verify`** — if a branch can't pass hooks, the slice is wrong; rework the breakup. This may mean re-proposing 5c to the user.
4. **No "ahead of time" code — every newly introduced function, component, type, or export in a PR must be *used* (called, rendered, referenced) in that same PR.** It is not enough that a later PR in the stack will eventually use it. If a symbol is introduced in PR N but its first caller lives in PR N+1, move the symbol down to PR N+1 (where it's actually wired up). Reviewers cannot reason about dead code — they have to mentally hold "this exists for something coming later" across PRs, which is exactly the failure mode this rule prevents. Concretely: for each branch, check that every new top-level export/component/function it adds has at least one caller within that same branch's diff; a symbol with zero in-branch callers is an orphan — relocate it. **Exception: schema changes.** A standalone schema PR (e.g. DB schema + generated migration, with no in-PR callers of the new columns/tables yet) is fine and often preferable — schema lands cleanly on its own, gets reviewed for shape independently of feature code, and unblocks the feature PRs above it. The "must have a caller in this PR" rule applies to application code (functions, components, helpers, types used only in app code), not to schema/migration files.
5. **Confirm equivalence at the end.** The cumulative diff of the top branch against `main` must match the preserved end state exactly: `git diff <top-branch> <snapshot>` should be empty. If it isn't, the split is wrong — fix before submitting.

This reset-and-rebuild pattern (snapshot, `gt modify`, re-slice) is **5d-only** — it's safe because the stack isn't published yet. Once it's submitted, the rules change (see Step 6).

## Step 6 — Submit stack; review loop

> **The stack is now append-only.** Review-finding fixes are new commits added on top (`git commit` → `gt submit`) — never `gt modify`/amend, never reset-and-rebuild, never force-push. (See point 6 and Rules.)

The review agent runs **remotely on the PR** — it's a GitHub-side bot that reads the PR's diff and posts findings as PR comments. The local agent does not run the review; it only waits for the remote agent to post and then reads its comments via `gh`.

The active review agent for this project is **Codex** — the agent-specific bindings (latency, author name, retrigger command) live inside the loop below. To swap in a different review agent later, change only those bindings.

Submit the stack via Graphite — one PR per branch, each opened as **ready for review** (not draft). Only fall back to draft if the user explicitly asks, or if something genuinely blocks the PR from being reviewable (e.g. a known-broken intermediate state the user wants to share for context). PR creation auto-triggers a review on each new PR.

**Keep every PR green.** Checks run on creation and re-run on every push. Treat a red check like a review finding: read its logs (`gh pr checks`), fix it with an additive commit (new commit, never amend/force), and push — watch checks on the same tick as review comments, and don't wait to be told. If a check is red for something only the user can fix (flaky infra, a user-controlled secret), say so and hand it over rather than looping.

**Before/after screenshots.** When a PR changes something user-visible, include before and after screenshots in its description — capture the after-state from the running app you exercised in Step 5a, and the before-state from `main`. Put them in the PR body where the visible change actually lands. Skip when there's nothing to see.

**Embed them as GitHub attachment URLs — not repo file links.** Upload each image to GitHub (paste or drag it into the PR description editor, which mints a `user-attachments/assets/...` URL) and reference that URL in the body. Do **not** commit the screenshots to the branch and link them via `blob/...?raw=true` or other repo URLs: GitHub won't reliably render those inside a PR body — they resolve through authenticated/raw endpoints the rendered `<img>` can't fetch, especially on a private repo, so they show up as broken — and committing throwaway images bloats the diff. After editing the body, reload the PR and confirm the images actually render rather than appearing broken.

For **each PR** (bottom-up), run this loop until either the PR is clean — CI checks green **and** no actionable review findings — **or** the user gives a merge signal (Step 7), whichever comes first:

1. **Wait for the review** to post. Latency is agent-specific — for Codex, ~6–7 min is typical. If the harness exposes a periodic-watcher mechanism (recurring scheduled check, polling loop, cron-style wake), set one up to fetch the PR's comments at that cadence and surface anything new from the review agent. Otherwise fall back to a single delayed wake (e.g. `ScheduleWakeup` at ~400s, kept under the prompt-cache TTL) and re-arm after each fetch.

   **Watcher lifecycle:** the watcher exists **to catch review findings and failing checks** — it is not responsible for waiting on the user's merge approval. Create it once when the stack is first submitted, and keep it running across all PRs and rounds while findings or check fixes are outstanding.

   **Per-PR review-complete condition.** A PR is complete for the watcher's purposes when any of:
   - It has been merged (no longer in the open set), or
   - It is clean: **all CI checks are green**, the review agent has reacted 👍 on the PR body, **and** every finding raised so far has been resolved (fixed and pushed, or explicitly skipped), with no new findings on the most recent re-review.

   **Tear down the watcher** when **all** PRs in its scope are review-complete (the condition must hold across every PR being watched — not just one). Whenever a single PR becomes review-complete, narrow the watcher's scope to drop that PR but keep watching the rest; stop the watcher entirely once nothing is left to watch. **Don't keep the watcher alive just to wait for the user's merge approval** — once findings are done, stop it, report that review is complete, and leave the merge (Step 7) for the user to trigger on their own time.

   Also tear it down immediately if:
   - The user gives an early merge signal in chat — the merge step takes over.
   - The workflow exits abnormally (user cancels, error path) — so the watcher doesn't keep firing in the background.

   Never leave a watcher running after review is complete or the workflow has moved on to merge/cleanup.

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
   - **Fix** — real bug, correctness issue, security issue, or other clear defect that is realistic for this product at its end state.
   - **Skip** — nit, style-only, false positive (the reviewer misread the code), already handled, overly-defensive (adds complexity for scenarios that won't realistically occur — redundant null checks on framework-guaranteed values, error handling for impossible states, excessive validation on internal-only paths), **or unrealistic for this product**.

   **Realism check.** Before classifying as Fix, ask: is this finding actually realistic for **this product** at the **end state we're building toward**? Every finding implicitly assumes something — about scale, concurrency, deploy ordering, traffic shape, who calls the code, or whether there's existing usage to protect — and the question is whether that assumption holds here. Common ways it doesn't:
   - **Scale/concurrency the product won't hit** — concurrency hardening on a flow that runs serially or for a small user base, atomic guards / advisory locks / raw SQL defending a single-tenant low-volume action against the same user double-clicking, rate-limit edge cases on internal endpoints, race fixes on a cron job that runs once at a time.
   - **Deploy/operational shape the project doesn't use** — defending against app code running before its own migration when migrations always ship with the code, cross-version traffic during a rolling deploy on a single-instance app, replica lag in a single-region setup.
   - **Calling surface that doesn't exist** — concurrency on a path only invoked from one operator console, auth hardening on an endpoint never exposed externally.
   - **Backward compatibility / existing usage that doesn't exist** — most of this code is MVP / prototype with **no production usage, no persisted data in the old shape, and no external callers** depending on the current behavior. Findings of the shape "this is a breaking change," "preserve the old API / signature / response shape," "add a compatibility shim / deprecation path," "migrate existing rows / existing callers," or "don't change this enum/field/default because something might rely on it" assume an installed base that isn't there yet. When there's no existing usage, the right move is to **just change the thing cleanly** — no shims, no dual-write, no deprecation window, no defensive migration of data that doesn't exist. Default these to Skip. **The load-bearing assumption is "there is no existing usage." If you cannot confidently establish that** — e.g. the feature looks already-shipped, there's a populated table in the old shape, there are external/public API consumers, or the ticket implies live users — **do not assume it away. Stop and ask the user** whether existing usage needs to be preserved before deciding Fix vs. Skip (see point 5). It is fine to pause here and verify rather than guess.

   Watch for **fix cascades**: if a finding only exists because an earlier defensive fix opened the window it's now guarding (e.g. a seeding step introduced a stale-read race, which a guard introduced a hot-path cost, which another fix tries to optimize), the whole chain is usually skippable — the cascade itself is a signal the first fix shouldn't have landed. Don't reach for raw SQL / advisory locks / extra schema columns to defend a hypothetical when a transaction or a one-line comment would do.

   **Migration-ordering findings are the canonical cascade trigger** and should be Skip by default. Anything of the shape "what if app code runs before its backfill / what if a row exists with default usage before the migration corrects it / restore-or-create the missing row in the request path" assumes a deploy window that doesn't exist here — migrations ship with the code and apply before the new code serves traffic. The right shape is a migration + a backfill, full stop; per-request reconciliation, in-flow seeding, or "ensure account exists" guards in business logic are the first link of the cascade. Skip them on sight rather than implementing and then unwinding later.

   If the scenario won't occur in this product's actual usage, classify as Skip. The goal is to fix real bugs, not gold-plate the code — reasonable assumptions about how this app is deployed and used are allowed. But don't default to Fix just because the reviewer raised it, and don't silently Skip something the user might want; genuine uncertainty about realism — especially whether existing usage must be preserved — is a question for the user (point 5), not a coin flip.

5. **Triage autonomously and report — but stop and ask whenever you're not sure.** For findings you have a confident position on, decide Fix vs. Skip yourself and act on them (point 6) without waiting. But if the realism check left you genuinely unsure — most often a backward-compat finding where you can't confirm whether existing usage must be preserved — **don't pick a side to keep the loop moving.** Break the loop: pause and ask the user about those specific findings before acting on them; the rest of the round proceeds in parallel. Verifying costs a message; guessing wrong costs a bad fix or a shipped regression. Post a status message either way so the user can interject. Format:
   - **Context header** at the very top: ticket id + title, a one-line summary of what this stack is shipping, and a compact list of the PRs (slug + URL). The user shouldn't need to open anything to recall the scope.
   - **Per-PR review status**: for each PR, one of `clean` (review agent reacted 👍 on the PR body), `findings: N` (with N findings to address this round), `awaiting review`, or `re-review pending` (after a retrigger). Note CI state here too (e.g. `checks: 2 failing`) so a red PR is visible alongside its review state.
   - **Findings this round** with the agent's autonomous Fix/Skip decision + one-line reason + source link. New-this-round and carried-over both shown for clarity. Skip findings appear once and are not carried forward.
   - **Next action**: "fixing the N valid findings, recording N skips on the PR, and retriggering review" (or "no fixes — recording N skips on the PR and retriggering review", or "no actionable findings and no skips — waiting for next watcher tick"). If any findings are held for the user, say so explicitly here — e.g. "holding M findings for your call on whether existing usage must be preserved; acting on the rest" — and make clear those M are blocked pending the user's answer.

   For the findings you're confident about, don't wait — proceed straight to point 6. For any finding you flagged as uncertain above, hold it and wait for the user's answer before acting on it; the loop continues for the rest. The user can also short-circuit the whole loop at any time via a chat merge signal or a GitHub `APPROVED` review (see Step 7).

6. **Act on the findings.**

   **For each Fix finding:**
   - Make the change on the branch that owns the code as a **new commit** — one focused commit per finding, referencing it (`git commit` → `gt submit`). **Not `gt modify`/`git commit --amend`**: those rewrite the tip and force-push, squashing the fix into the prior commit and defeating the commit-by-commit review the user relies on. (`gt modify` is the `graphite` skill's default for shaping an *unsubmitted* stack — not for review fixes.) A commit on top is a fast-forward; only Graphite's automatic child-restack force-pushes, and you never invoke it.
   - **After each fix commit lands on the PR (i.e. is pushed):**
     1. Post a top-level PR comment summarizing the fix:
        ```bash
        gh pr comment <num> --body "Fixed in <sha>: <one-line description of how it was fixed>"
        ```
     2. Reply directly to the review-agent's finding comment with the same fix reference, so the reviewer's thread is closed out:
        ```bash
        gh api repos/{owner}/{repo}/pulls/<num>/comments/<finding-comment-id>/replies \
          -f body="Fixed in <sha>: <one-line description>"
        ```
        (For top-level issue comments rather than diff-line comments, post a follow-up issue comment quoting the finding instead.)

   **For each Skip finding** (including the "unrealistic for this product" bucket from point 4):
   - Reply to the finding comment with a short rationale so the reviewer's thread shows it was considered, not ignored:
     ```bash
     gh api repos/{owner}/{repo}/pulls/<num>/comments/<finding-comment-id>/replies \
       -f body="Skipping: <one-line reason — e.g. 'this code path only runs from a single operator console; concurrency hardening isn't realistic for this product'>"
     ```
   - **Update the PR description** to record the explicit skip so future review rounds don't resurface it. Maintain a `## Explicit skips` section at the bottom of the PR body and append a bullet for each skip: `<one-line finding summary> — <reason>` with a link to the finding comment. Edit the PR body via:
     ```bash
     gh pr edit <num> --body "$(updated body)"
     ```
     The section serves as durable context for the review agent on the next pass.

7. **Retrigger the review.** Always retrigger after acting on a round, **including rounds where every finding was skipped** — the explicit skip rationales (in replies and in the PR description) need another pass so the reviewer can either drop those points or push back with new arguments. The only round that does not retrigger is one where there were zero findings to act on in the first place. For Codex:
   ```bash
   gh pr comment <num> --body "@codex review"
   ```

If a finding spans multiple PRs, fix on the lowest PR that owns the code so children inherit it when Graphite restacks them onto the updated parent.

### 6e. Review complete — generate the final brief

Once every watched PR is review-complete and the watcher has been torn down (see the watcher lifecycle above), and the user has not already given a merge signal, invoke the `brief` skill if it's installed. With real PRs in place and review complete, it auto-detects FINAL mode and produces a visual HTML one-pager from the final history, the cumulative diff, the PR stack, and the review threads. Give the user the brief's path, then wait at the Step 7 merge gate. If the user already gave a merge signal, skip straight to Step 7. If `brief` isn't installed, skip this step.

## Step 7 — Merge (gate)

Merge-ready when the user gives an explicit merge signal — either:

- said `merge` / `approved` / `ship it` / equivalent in chat, **or**
- submitted an `APPROVED` PR review on any PR in the stack via GitHub. Detect with:
  ```bash
  USER=$(gh api user --jq '.login')
  gh pr view <num> --json reviews \
    --jq ".reviews[] | select(.author.login == \"$USER\" and .state == \"APPROVED\")"
  ```
  The agent doesn't continuously poll for this — once review is complete and the watcher has stopped (Step 6), it reports that the stack is ready and waits. Check for a GitHub approval when the user next engages, or act on a chat merge signal directly.

The user signal is sufficient on its own — unresolved review-agent findings do not block merge once the user has explicitly approved (the user has seen them and chosen to ship anyway). A clean review without an explicit user signal is **not** enough.

When approved:

1. **Generate migrations** if the schema source changed. Use the project's standard generator in **create-only / generate** mode — never apply to the connected DB without explicit user approval. Commit the generated file onto the schema-owning PR, then resubmit the stack.

   Then assess whether applying the migration **before** merging makes sense (e.g. the new code expects the schema and would break in shared environments otherwise; or the migration carries non-trivial transformations worth dry-running first). If yes, ask the user to confirm applying. **Block the merge until the user explicitly approves or declines applying.** If approved, apply via the project's standard apply command. If declined, proceed to merge with the migration file committed but unapplied.

2. **Merge bottom-up via Graphite.** Confirm each PR's checks are green before merging it — the step-1 migration commit re-runs CI and can turn a green PR red. Fix red checks first; never silently merge red. Then merge the trunk-most PR first; Graphite restacks descendants automatically so each subsequent PR's base becomes `main`. Repeat until the stack is empty.
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

- **When a request is vague or open to multiple interpretations — especially if the outcomes would differ significantly — ask clarifying questions before starting work.** Don't guess at scope or approach and build the wrong thing; a clarifying question is cheap, a wrong implementation is not.
- **When current third-party docs are needed** for a library, framework, SDK, or service API, use the **Context7 MCP first** to resolve the correct library ID and fetch up-to-date, version-specific documentation and code examples from the source. Prefer this over model memory for setup steps, configuration, API usage, and code generation. Fall back to official docs or web search only if Context7 doesn't cover the need.
- No AI attribution in commits, PR titles, or PR bodies.
- **Never force-push. This is a hard rule, not a default.** Do not run `git push --force` / `--force-with-lease`, and do not pass any force/squash flag to Graphite (`gt submit --force`, `gt submit --squash`, or equivalent). The **only** force-push allowed is the implicit one Graphite performs on its own during a `restack` to realign a branch onto its updated parent — that is internal to Graphite's stacking and you never invoke it directly. If a push is rejected as non-fast-forward, **stop and ask the user** — do not reach for `--force` to get past it.
  - **Why this matters to the user:** force-pushing rewrites the branch and collapses the work into a single squashed commit, destroying the per-commit history. The user reviews changes **commit by commit** and needs every incremental change to remain a distinct, inspectable commit on the PR. A force-push throws that away. Each implementation step and each review-finding fix must stay as its own commit (see Step 6, point 6) — pushed additively, never rewritten.
- No `--no-verify` unless the user asks.
- Review-finding fixes always land as separate commits on the PR branch — a new commit and `gt submit`, **never `gt modify`**/amend/squash unless the user explicitly asks. (`gt modify` is the `graphite` skill's default for shaping an unsubmitted stack; it doesn't apply once the stack is in review.)
- If the plan turns out wrong mid-implementation, stop and re-confirm with the user.
- If Linear MCP is unreachable mid-flow, surface the would-be status change in chat and ask the user to update Linear.
- PR titles use conventional commits (`feat(scope): …`). PR bodies include `Closes <LINEAR-ID>` so Linear auto-closes on merge.
- PR bodies for UI-affecting changes include **before/after screenshots** of the changed view (see Step 6). Omit only when there's nothing user-visible to show.
- **Every PR stays green.** Fix failing CI checks with additive commits until they pass; a red PR is neither review-complete nor merge-ready (see Step 6). Only the user can waive a check that can't be fixed from the code.
