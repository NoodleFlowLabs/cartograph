# Cartograph Visualizer: Tab Grouping & Onboarding

## Overview

Update the Cartograph visualizer HTML to (1) add a proper onboarding/welcome screen before JSON is loaded, and (2) group the now-expanded 8-tab visualizer into PM and Eng categories. The visualizer remains a single self-contained HTML file.

## Goals

- First-time users understand what Cartograph does and how to use it before they see the complex tab UI.
- The tab bar communicates that some tabs are code-oriented and others are product-oriented, without imposing a rigid separation.
- The grouped tab bar communicates the new Overview and Code Health entry points clearly.

## Non-Goals (explicitly out of scope)

- No server dependency or build step.
- No local server, npx CLI, or build step. The file stays a standalone HTML file opened via `file://` or any static server.
- No mobile responsiveness. This is a desktop-only tool.
- No changes to the `cartograph.json` data model or the SKILL.md workflow.
- No visual preview / screenshot on the welcome screen (deferred — will add later when we have a good screenshot).

---

## Change 1: Welcome / Onboarding Screen

### Current Behavior

When the visualizer opens without data, it shows a drop-zone overlay with a file picker button. The overlay is minimal — just "Load your cartograph.json" with a button, no context.

### New Behavior

Replace the current drop-zone overlay with a full-page welcome screen that serves as onboarding. This screen is shown until the user loads a JSON file. Once loaded, it transitions to the existing tab UI.

### Welcome Screen Content

**Tagline:**

> "Remember when you could hold your entire codebase in your head? Cartograph brings that back."

**Value prop bullets (3-4):**

- **Map your codebase** — See every surface, feature, entity, and data flow in one place.
- **Bridge code and product** — Eng sees code structure; PM sees the product. Same data, different lenses.
- **Copy context for AI agents** — One-click prompts with all relevant files and context, ready to paste into your coding agent.
- **Understand, don't guess** — From blind to perfectly mapped out. Navigate your codebase like you built it yourself.

**How to generate section:**

```
How to get started:

1. Open your AI coding agent in your project directory
2. Run /cartograph
3. Wait for the analysis to complete (a few minutes for large codebases)
4. Load the generated cartograph.json below
```

**File upload area:**

- A drop zone + file picker button, styled to match the clean developer tool aesthetic.
- Drop zone accepts `.json` files.
- Same functionality as current implementation (FileReader, drag-and-drop, click-to-browse).
- On successful load, the welcome screen fades/transitions away and the main tab UI appears.

### Visual Design

- Dark background matching the existing visualizer theme (`#0a0a0a` / `#1a1a1a`).
- Content centered vertically and horizontally.
- Clean typography — system font stack, similar to the existing UI.
- Tagline in larger/bolder text. Bullets and instructions in regular text.
- The upload area should be visually prominent but not dominate — it's the call-to-action, not the hero.
- Overall feel: Linear / Vercel dashboard — polished, minimal, confident.

### Layout (approximate)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              [Cartograph logo/name]              │
│                                                  │
│   "Remember when you could hold your entire      │
│    codebase in your head? Cartograph brings      │
│    that back."                                   │
│                                                  │
│   • Map your codebase — ...                      │
│   • Bridge code and product — ...                │
│   • Copy context for AI agents — ...             │
│   • Understand, don't guess — ...                │
│                                                  │
│   ─────────────────────────────────              │
│                                                  │
│   How to get started:                            │
│   1. Open your AI coding agent...                │
│   2. Run /cartograph                             │
│   3. Wait for analysis...                        │
│   4. Load cartograph.json below                  │
│                                                  │
│   ┌──────────────────────────────┐               │
│   │  Drop cartograph.json here   │               │
│   │  or [Browse files]           │               │
│   └──────────────────────────────┘               │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Change 2: Tab Grouping

### Current Behavior

Before restructuring, the visualizer used 7 flat tabs in a single row:

```
Surfaces | Features | Entity Map | Flows | Code Map | File Tree | Operations
```

### New Behavior

The current tab bar groups 8 tabs into PM and Eng:

```
Overview  ·  PM  Surfaces | Features | Flows  ·  ENG  Feature Map | Data Model | Code Organization | Code Health
```

### Tab Assignment

| Group | Tabs (in order) | Rationale |
|-------|-----------------|-----------|
| **Shared** | Overview | Cross-cutting dashboard spanning both PM and Eng concerns. |
| **PM** | Surfaces, Features, Flows | Product-oriented: pages, capabilities, and user journeys. |
| **ENG** | Feature Map, Data Model, Code Organization, Code Health | Code-oriented: file structure, entity model, compartment layout, and engineering quality. |

### Visual Treatment

The grouping must be **subtle** — a hint, not a hard boundary. Implementation:

1. **Small group labels**: "PM" and "ENG" text displayed in muted/secondary color (`#737373` or similar), uppercase, smaller font size (10-11px), positioned to the left of each group's first tab. These labels are not clickable.

2. **Spacing**: A slightly wider gap between the last PM tab (Flows) and the first Eng tab (Feature Map) — roughly 2-3x the normal tab gap. No hard vertical divider line.

3. **No other visual distinction**: Both groups use the same tab styling, same active indicator (blue underline), same click behavior. The grouping is purely informational.

### Default Tab

Overview (a standalone tab before the PM/ENG groups) is the default active tab when JSON is loaded.

### Tab Switching

No behavioral change. Clicking any tab activates it exactly as today. The group labels are decorative only — they don't affect navigation.

---

## Implementation Notes

### Files Modified

1. **`.agents/skills/cartograph/assets/visualizer.html`** — The implementation. Welcome screen + grouped 8-tab bar.
2. **`.agents/skills/cartograph/specs/spec-visualizer-refactor.md`** — Update the HTML tab bar markup and tab registry to reflect the Overview / Feature Map / Data Model / Code Organization / Code Health layout.
3. **`.agents/skills/cartograph/specs/spec-file-tree.md`** — Rename the File Tree tab to Feature Map.
4. **`.agents/skills/cartograph/specs/spec-code-map.md`** — Rename the Code Map tab to Code Organization.

Files that do **not** need schema changes:
- `SKILL.md` — Does not reference tab names or order.

### Welcome Screen Implementation

- Replace the current `#dropzone` overlay content with the new welcome screen HTML/CSS.
- Keep the same JavaScript: `FileReader` for drag-and-drop and file picker, `loadData()` call on success.
- Add a transition (fade or slide) from welcome screen to main UI on successful JSON load.
- The main UI (`#app` or equivalent) starts hidden and is shown after data loads, same as today.

### Tab Grouping Implementation

- In the tab bar HTML, add small `<span>` elements for the "PM" and "ENG" labels.
- Add CSS for the labels (muted color, small font, uppercase, letter-spacing).
- Add a CSS class or margin to create the wider gap between the two groups.
- Reorder the tab buttons to match the new order: Overview, then the PM group (Surfaces, Features, Flows), then the Eng group (Feature Map, Data Model, Code Organization, Code Health).
- Update `switchTab()` and any tab-ordering logic if it relies on DOM order.

### What NOT to Change

- No changes to the welcome-screen behavior beyond what is documented here.
- No changes to the data model, JSON schema, or SKILL.md.
- No changes to the stats bar, search, or LLM context copy functionality.
- No introduction of external dependencies, build steps, or module systems.
- Spec file updates are limited to fixing stale tab-order references — no functional changes to those specs.

---

## Edge Cases

- **Browser compatibility**: The welcome screen and tab grouping use only basic HTML/CSS. No browser compatibility concerns beyond what already exists.
- **Very long project names**: The stats bar already handles this; no new concern.
- **Tab overflow on narrow screens**: With 8 tabs plus two group labels, the tab bar could overflow on narrower desktop windows. Tabs should wrap gracefully, matching the existing desktop-only behavior.

---

## Future Considerations (explicitly deferred)

- **Additional PM/ENG sub-grouping** — any further grouping beyond the current 8-tab split.
- **Invariants / Health Checks** — New PM tab for business invariants.
- **Tech Lead / Teach Code** — New Eng tab for patterns and best practices.
- **Designer group** — Third tab group for component library, UI theme, styles.
- **Visual preview on welcome screen** — Screenshot or CSS mockup showing what the loaded UI looks like.
- **Visualizer refactor to ES modules** — Per `spec-visualizer-refactor.md`, splitting the monolith. Orthogonal to this work.
- **npx cartograph CLI** — Auto-open browser and serve files. Deferred.
- **Mobile responsiveness** — Desktop-only for now.
