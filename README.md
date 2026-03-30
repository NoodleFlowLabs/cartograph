# Cartograph

Vibe coding lets you ship fast. But the codebase grows faster than your understanding.

At some point you notice: your agent doesn't understand your requests as clearly anymore. It makes more mistakes. One change silently breaks three others. You've lost track of what's in the codebase — which pages exist, how features connect, what the data model looks like. The whole thing became a black box, and you're flying blind.

## How Cartograph Solves This

Cartograph scans your entire codebase and maps it out — every page, feature, user flow, data model, and file. It gives you a bird's-eye view of your product, scores your code health, defines invariants that should never break, and generates copy-pasteable prompts so your agent has full context without you re-explaining every time.

It's an open-source agent skill. Runs locally. Your code never leaves your machine.

[Learn More](https://noodleflow.ai/cartograph) · [Skills Marketplace](https://skills.sh/NoodleFlowLabs/cartograph/cartograph) · [Discord](https://discord.gg/ccTgESTa) · [Issues](https://github.com/NoodleFlowLabs/cartograph/issues)

---

## Features

### Bird's-Eye View of Your Product

See everything that exists in your codebase at a glance:

- **Surfaces** — every page and route in your app
- **Features** — standalone capabilities embedded across surfaces
- **Flows** — user journeys traced step-by-step through code
- **File Tree Map** — what each file is actually for
- **Data Model** — entities, relationships, and operations
- **Code Organization** — logical groupings that bridge product concepts to code

### Code Health Scores

Cartograph scores your codebase across multiple dimensions and highlights what needs fixing:

- **Co-location** — are related files grouped together or scattered?
- **DRYness** — duplicate patterns detected with prompts to consolidate
- **Dead code** — unused files, dead features, unreachable paths
- **Framework best practices** — Next.js, React, and more

### Invariants

Define the rules your product should never violate:

- "Auth must be required on all dashboard routes"
- "Cart cannot be empty at checkout"
- "Free trial users can't access Pro features"

When you or your agent make changes, verify invariants still hold. Catch regressions before they ship.

#### Adding an Invariant

Tell the cartograph skill what should always be true, in plain language:

```bash
/cartograph add this invariant: "credits are always refunded on failed generations"
```

The agent will:

1. Analyze your codebase to understand the assertion
2. Expand it into a full definition with verification steps, pass criteria, known scope, and a copy-pasteable verification prompt
3. Append it to `cartograph-invariants.md` at your repo root
4. Run an initial verification and report whether it currently holds

Invariants are stored in `cartograph-invariants.md` using this format:

```markdown
## Invariant Display Name

---

id: unique-kebab-case-id
severity: critical
enabled: true
tags: [money, credits]

---

**Assertion:** One-sentence claim that must always be true.

**Verification steps:**

1. Concrete step referencing specific files/patterns...

**Pass criteria:** What "passing" looks like.

**Known scope:** Relevant file paths and directories.

**Verification prompt:**

> Self-contained prompt for re-verification by any agent...
```

Severity levels: `critical` (money, security, data integrity), `high` (core product logic), `low` (conventions). Set `enabled: false` to pause an invariant. Delete the `##` section to remove it permanently.

#### Verifying Invariants

Run just the invariant verification step without a full scan:

```bash
/cartograph verify invariants
```

This reads `cartograph-invariants.md`, checks each enabled invariant against your codebase, and prints a pass/fail summary. Results are also written to the `invariants` key in `cartograph.json` (all other data is preserved), so you can view them in the visualizer.

### Copy-Paste Prompts

Every finding comes with a structured prompt you can paste directly into your agent. Fix code health issues, implement features that integrate correctly with existing code, or consolidate duplicates — all with full codebase context already baked in.

No more re-explaining your product's architecture every time you prompt. Better context in, better code out.

---

## Getting Started

### 1. Install

```bash
npx skills add NoodleFlowLabs/cartograph --skill cartograph
```

### 2. Run

```bash
/cartograph
```

Works in Claude Code, Codex, or any agent that supports skills. This scans your entire codebase and outputs `cartograph.json` with all findings into your project root.

### 3. Explore

Open the bundled visualizer (`assets/visualizer.html`) in your browser, or use the hosted copy:

```bash
open https://tools.cartograph.sh/visualizer
```

Drag-drop `cartograph.json` into the visualizer and explore every dimension.

### 4. Iterate

Use the generated prompts to fix issues and improve health. Run `/cartograph` again. Repeat until your codebase is healthier, better structured, and your agent performs like it should.

---

## Local-First

- Runs entirely on your machine
- No cloud, no telemetry, no account required
- Your code never leaves your environment
- Zero config

---

## Community

- [Discord](https://discord.gg/ccTgESTa) — questions, feedback, show what you mapped
- [Issues](https://github.com/NoodleFlowLabs/cartograph/issues) — bug reports, feature requests
- [Skills Marketplace](https://skills.sh/NoodleFlowLabs/cartograph/cartograph) — install page
- [Landing Page](https://noodleflow.ai/cartograph) — learn more

---

## License

MIT
