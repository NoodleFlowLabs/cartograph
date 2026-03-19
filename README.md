# Cartograph

**Remember holding your whole codebase in your head?**

Vibe coding made building fast — but your codebase grew faster than your understanding. Cartograph maps it all out so you can hold the whole picture again.

An open-source agent skill that runs locally in [Claude Code](https://claude.ai/code) or [Codex](https://openai.com/codex). It analyzes any TypeScript/JS web app across seven dimensions, produces a `cartograph.json` with all findings, and generates an interactive `visualizer.html` to explore everything in your browser.

Your code never leaves your machine.

[Learn More](https://noodleflow.com/cartograph) · [Skills Marketplace](https://skills.sh/ilamanov/skills/cartograph) · [Discord](https://discord.gg/ccTgESTa) · [Issues](https://github.com/ilamanov/cartograph/issues)

---

## Quick Start

### 1. Install the skill

```bash
npx skills add ilamanov/cartograph --skill cartograph
```

### 2. Run it in Claude Code or Codex

```bash
/cartograph
```

### 3. Explore the output

Two files land in your project root:

- **`cartograph.json`** — structured map of your entire codebase
- **`visualizer.html`** — interactive local visualizer

Open `visualizer.html` in your browser, drag-drop the JSON file, and explore.

---

## What Gets Mapped

Cartograph extracts seven dimensions from your codebase, organized into two groups:

### Your Product

| Dimension    | What it maps                                     |
| ------------ | ------------------------------------------------ |
| **Surfaces** | Pages, routes — the navigable shape of your app  |
| **Features** | Standalone capabilities embedded across surfaces |
| **Flows**    | User journeys traced step-by-step through code   |

### Your Code

| Dimension             | What it maps                                                           |
| --------------------- | ---------------------------------------------------------------------- |
| **File Tree Map**     | Per-file feature attribution — what each file is really for            |
| **Data Model**        | Entities, relationships, and operations — your domain layer mapped out |
| **Code Organization** | Logical groupings that bridge product concepts to code                 |
| **Code Health**       | Co-location, DRYness, dead code — scores and prompts to fix            |

---

## Copy-Paste Prompts

Every dimension comes with copy-pasteable prompts. Paste them into your AI coding agent to fix issues or build features — all the context is already there, no need to explain your codebase from scratch.

---

## How It Works

A multi-wave agent workflow runs locally on your machine:

1. **Run** `/cartograph` in Claude Code or `npx cartograph`
2. **Analyze** — parallel agents extract surfaces, features, entities, flows, code health, and more
3. **Output** — `cartograph.json` + `visualizer.html` land in your project root
4. **Explore** — open the visualizer, drag-drop the JSON, browse every dimension
5. **Act** — copy prompts into your AI coding agent to fix or build with full context

---

## Who It's For

**Engineers** — Code health scoring, dead code analysis, framework best practices. Highlights problems and gives you prompts to fix them. Make your codebase second nature again.

**Builders & Vibe Coders** — See every page, feature, and flow without reading code. Copy-paste prompts to implement features or fix issues — no engineering help needed. Stop flying blind.

---

## Local-First

- Runs entirely on your machine
- No cloud, no telemetry, no account required
- Your code never leaves your environment

---

## Community

- [Skills Marketplace](https://skills.sh/ilamanov/skills/cartograph) — install page
- [Discord](https://discord.gg/ccTgESTa) — questions, feedback, show what you mapped
- [Issues](https://github.com/ilamanov/cartograph/issues) — bug reports, feature requests
- [Landing Page](https://noodleflow.com/cartograph) — learn more

---

## License

MIT
