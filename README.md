# Cartograph

## The Problem

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
open https://cartograph.noodleflow.ai/visualizer
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

- [Skills Marketplace](https://skills.sh/NoodleFlowLabs/cartograph/cartograph) — install page
- [Discord](https://discord.gg/ccTgESTa) — questions, feedback, show what you mapped
- [Issues](https://github.com/NoodleFlowLabs/cartograph/issues) — bug reports, feature requests
- [Landing Page](https://noodleflow.ai/cartograph) — learn more

---

## License

MIT
