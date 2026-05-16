---
name: spec-builder
description: Transform vague product or feature ideas into concrete, detailed specification documents through an interactive interview process. Use when the user wants to flesh out an idea, create a spec, write requirements, plan a product/feature/prototype, or go from "I have this idea..." to a concrete document. Works for software products, physical products, services, or any concept that needs specification.
---

# Spec Builder

Transform vague ideas into concrete, actionable spec documents through structured interviews.

## Workflow

### Phase 1: Gather Initial Context

First, prompt for the idea:

```
What's the idea you'd like to turn into a spec?
Describe it however it exists in your head right now - it can be vague.
```

Then ask background questions to calibrate the interview depth:

```
AskUserQuestion:
1. "What's your background?"
   - Technical (developer/engineer)
   - Semi-technical (PM, designer, technical founder)
   - Non-technical (business, creative, general user)

2. "What's the goal for this spec?"
   - MVP/prototype to test the idea
   - Full product spec for development
   - Implementation plan for an AI coding agent
   - Pitch document for stakeholders
   - Personal reference to clarify my thinking
```

### Phase 2: Deep Interview

Conduct the interview using AskUserQuestion with **batched questions** (2-4 related questions per batch).

**Rules:**

- Never assume - if something is ambiguous, ask
- Provide sensible default options for every question
- Add "(Recommended)" to the best default option
- Anticipate needs the user hasn't considered
- Adapt question depth based on user's technical level

**Question calibration by user background:**

| Topic        | Technical User                     | Non-Technical User                                  |
| ------------ | ---------------------------------- | --------------------------------------------------- |
| Architecture | "REST vs GraphQL vs tRPC?"         | Skip - decide yourself                              |
| Data storage | "SQL vs NoSQL? Which DB?"          | "Does it need to remember data between sessions?"   |
| UI framework | "React, Vue, or Svelte?"           | Skip - decide yourself                              |
| Hosting      | "Serverless, containers, or VMs?"  | Skip - decide yourself                              |
| Auth         | "OAuth, magic links, or password?" | "How should users log in?" (plain language options) |
| Scale        | "Expected concurrent users?"       | "How many people might use this at once?"           |

**Prioritize load-bearing decisions:**

Not all decisions carry equal weight. Some are cheap to revisit later; others are foundational — they shape the core architecture, UX, or physical design and are expensive or painful to redo. The interview **must** identify which decisions are load-bearing for _this specific product_, surface them, and get explicit user approval before moving on. This applies to all product types.

The test: "If we change this after launch/production, does it require significant rework, data migration, retooling, or redesign?" If yes, it's load-bearing and must be discussed upfront. If not, it can be iterated on later and doesn't need deep interview time.

What counts as load-bearing varies by product. A few examples to calibrate your judgment:

- **Storage & data architecture** (software) — where content lives, when uploads happen, what's the source of truth
- **Async processing patterns** (software) — how long-running operations are tracked, who polls, how progress is communicated
- **Concurrency model** (software) — whether the system is designed for parallel workloads from the start, since retrofitting this is a rewrite
- **Core mechanism & form factor** (hardware) — how the thing fundamentally works, its dimensions, power source
- **Manufacturing process & materials** (hardware) — injection molding vs CNC vs 3D print changes cost, tolerances, and lead times
- **Regulatory & certification requirements** (hardware) — designing for compliance after the fact means costly redesigns
- **UI/UX model** (any) — sometimes trivial to change (colors, copy), sometimes load-bearing (e.g., a real-time collaborative interface vs. async workflow, or a feed-based layout that the entire data model is built around)
- **Third-party dependencies** (any) — switching providers often means rewriting integrations and handling different data formats
- **Auth & identity model** (software/services) — migrating users between auth systems is extremely disruptive

These are examples, not a checklist. For each product, think from first principles about what's "poured in concrete" vs. "rearranging furniture," and focus the interview accordingly.

For technical users, ask about load-bearing decisions directly. For non-technical users, simplify the concept but still get their approval — e.g., instead of "Should the frontend poll via request IDs or use server-sent events?", ask "When a generation takes 30 seconds, should the user see a live progress update or just get notified when it's done?"

**Spend interview time proportionally to how hard a decision is to reverse.** Don't deep-dive on aspects that are trivially changeable for this product unless the user raises them.

**Interview domains to cover** (adapt based on product type):

For **software products**:

- Core functionality (what does it do?)
- User types and permissions
- Key user flows (step by step)
- Data model (what entities exist, how they relate)
- Integrations (external services, APIs, fallback strategies)
- Edge cases and error handling
- Security and privacy requirements
- Platform (web, mobile, desktop, CLI)

For **physical products**:

- Core functionality
- User interaction (how do you use it?)
- Manufacturing considerations
- Safety requirements
- Packaging and delivery

For **all products**:

- Load-bearing decisions identified for this specific product (see above)

For **all products**:

- Success criteria (how do we know it works?)
- Constraints (budget, timeline, must-haves)
- Anti-goals (what it explicitly should NOT do)

**Example batched question:**

```
AskUserQuestion (batch):
1. "Who are the main users of this product?"
   - Single user type (just me / general public)
   - Two distinct roles (e.g., admin + regular user)
   - Multiple user types (need to define each)

2. "Do users need accounts?"
   - No accounts needed (Recommended for MVP)
   - Simple accounts (email/password)
   - Social login (Google, GitHub, etc.)
   - Enterprise SSO
```

### Phase 3: Draft Review

After covering core questions (~10-15 batches), present a **draft outline**:

```
Here's the spec outline based on our conversation so far:

## [Product Name] - Spec Outline

**Overview:** [1-2 sentences]

**Core Features:**
1. [Feature A]
2. [Feature B]
...

**User Types:** [list]

**Key Flows:** [list main workflows]

**Technical Approach:** [high-level decisions]

**Open Questions:** [things still unclear]

---

Does this capture your vision? What's missing or wrong?
```

Then use AskUserQuestion to get feedback:

```
1. "How does this outline look?"
   - Looks good, continue with details
   - Missing something important (I'll explain)
   - Some parts are wrong (I'll clarify)
   - Let's pivot direction
```

### Phase 4: Deep Dive

Based on feedback, ask detailed follow-up questions on:

- Unclear areas from the outline
- Edge cases and error states
- Specific UI/UX details
- Technical constraints
- Anything marked as "Open Questions"

Continue until confident all ambiguity is resolved.

### Phase 5: Write Spec

Write the final spec to `spec-<product-name>.md` in the current directory.

**Spec format principles:**

- Detailed enough for an AI coding agent to implement
- Skimmable for human review (use headers, bullets, tables)
- No vague language - every requirement must be concrete
- Include explicit anti-goals and out-of-scope items
- Write as a standalone document - never mention the interview process or reference "our conversation"

**Spec structure** (adapt sections based on product type):

```markdown
# [Product Name] Spec

## Overview

[2-3 sentences: what it is, who it's for, core value prop]

## Goals & Non-Goals

### Goals

- [Concrete goal 1]
- [Concrete goal 2]

### Non-Goals (explicitly out of scope)

- [What this product will NOT do]

## User Types

[Table or list of user types and their permissions/capabilities]

## Core Features

### Feature 1: [Name]

**Purpose:** [Why this feature exists]
**Behavior:**

- [Specific behavior 1]
- [Specific behavior 2]
  **UI:** [Description or wireframe reference]

[Repeat for each feature]

## User Flows

### Flow 1: [Name]

1. User does X
2. System responds with Y
3. User sees Z
   ...

[Repeat for key flows]

## Data Model

[Tables, entities, relationships - for software]
[Components, materials - for physical products]

## Technical Decisions

[Architecture choices, technologies, integrations]
[Explicitly document every load-bearing decision (storage, async patterns, concurrency, etc.) and note that it was discussed and approved during the interview]
[For non-technical users, describe these in plain language; for physical products, skip]

## Edge Cases & Error Handling

- When X happens, the system should Y
- If Z fails, show error message: "..."

## Open Questions

[Anything that still needs resolution before building]

## Future Considerations

[Ideas mentioned but explicitly deferred]
```

## Key Principles

1. **Load-bearing decisions first** - Identify and resolve architectural decisions that are hard to undo before spending time on details that are easy to change later. The interview's primary job is to surface these and get explicit approval.
2. **Be thorough** - Ask many questions. 10-20 batches is normal for a complex product.
3. **Never assume** - If two interpretations are possible, ask which one.
4. **Provide defaults** - Every question should have reasonable options with a recommended choice.
5. **Adapt depth** - Technical users get technical questions; non-technical users get plain language. But even non-technical users must approve load-bearing decisions — just explain them simply.
6. **Surface unknowns** - Ask about things the user probably hasn't considered yet.
7. **Stay concrete** - The final spec should have zero vague requirements.

## Self-Note

Before finalizing the spec, ask yourself:

- "What are the load-bearing decisions I haven't surfaced yet? Is there anything in this spec that would be painful to change once built — and that I haven't explicitly confirmed with the user?"
- "What are the edge cases I didn't consider?"
