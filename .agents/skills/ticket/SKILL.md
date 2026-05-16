---
name: ticket
description: Creates a new Linear issue from a free-form description. Drafts a structured title and body, picks team/project/labels/priority from the connected workspace, shows the draft to the user for approval, then creates the ticket. Use when the user asks to "create a Linear ticket", "file an issue", "make a ticket", "open an issue in Linear", or any request to log a new bug/feature/task.
---

# Ticket

Create a Linear issue from a free-form description.

This skill is the **upstream pair** of the `ship` skill: the issues it creates are the inputs `ship` picks up and implements end-to-end. Draft tickets so they read well as inputs to `ship` — clear scope, explicit acceptance criteria, and the plan-approval marker (see Step 3) when the user wants `ship` to gate on a plan review before implementing.

## Required tools

- **Linear MCP** — to list workspace metadata (teams, projects, labels, statuses) and create the issue. If unreachable, ask the user to reconnect.

## Workflow

1. **Read the description.** If too thin to form a useful ticket (no problem statement, no scope), ask one short clarifying question. Otherwise proceed.

2. **Probe the workspace** via the Linear MCP:
   - **Pick the team that matches the current project directory** — list teams and choose the one whose name / key / linked GitHub repo corresponds to the repo the skill is running in. If the match is ambiguous, ask the user once and remember it.
   - List that team's projects and labels.
   - Pre-select the project tied to the current repo if obvious.

3. **Draft the ticket:**
   - **Title** — short, imperative, no trailing period (e.g. "Fix double-tap heart on profile grid").
   - **Description** — markdown using this template (omit sections that don't apply):

     ```md
     ## Context

     <why this matters / where it shows up>

     ## Current behavior

     <what happens today, if it's a bug>

     ## Desired behavior

     <what should happen>

     ## Acceptance criteria

     - [ ] ...

     ## Notes

     <links, edge cases, code snippets in fenced blocks>
     ```

   - **Labels** — pick from existing labels only. Don't invent.
   - **Priority** — infer from language ("urgent", "blocker" → High; "nice to have" → Low). Default Medium.
   - **Assignee** — leave unassigned unless the user named one.
   - **Plan-approval marker** — if the user says implementation should require plan approval before code is written, append a clear line to the description: `**Plan first: please post a plan and wait for approval before implementing.**` The `ship` skill scans the ticket for wording like this to decide whether to gate on a plan review.

4. **Show the draft** in chat with title, body, team, project, labels, priority. **Wait for explicit approval.** Edit and re-show on requested changes.

5. **Create** the issue via the Linear MCP. Then post the **user's original request verbatim** as the first comment on the new ticket — this preserves what the user asked for in their own words, separate from the polished description. Don't paraphrase, summarize, or trim it; copy the request exactly as the user wrote it (in a fenced quote block if it contains markdown that would render oddly). Report back the issue ID and URL.

## Rules

- No AI attribution in the body.
- Labels and priorities must already exist in the workspace.
- File paths, errors, and stack traces go verbatim in `## Notes` inside fenced code blocks.
- If the description names a parent or duplicate, set the relation on creation.
