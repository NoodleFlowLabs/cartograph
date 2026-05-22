# Cartograph Visualizer: Tab Restructuring

## Overview

Restructure the Cartograph visualizer from 7 tabs + a Code Health sidebar into 8 cleaner tabs. Remove redundancy (Operations merges into Data Model), fix unclear naming (Entity Map → Data Model, Code Map → Code Organization, File Tree → Feature Map), add a missing bird's-eye Overview, and promote Code Health from a hidden sidebar to a first-class tab.

No changes to the `cartograph.json` data model. Everything is computed from existing arrays.

## Goals

- First-time users land on a dashboard that answers "what does this codebase look like?" before diving into any specific tab.
- Tab names are immediately understandable to both engineers and non-technical builders.
- Code health findings ("clean up vibe-coded slop") are a first-class experience, not buried in a collapsible sidebar.
- Operations data is accessible in context (on the entity that owns them) rather than in a disconnected flat list.

## Non-Goals

- No changes to `cartograph.json` schema, SKILL.md workflow, or agent pipeline.
- No mobile responsiveness.
- No new data collection — Overview computes everything from existing arrays.
- No changes to the welcome/onboarding screen.
- No changes to LLM context copy functionality (keep all existing "Copy as LLM context" buttons working).

---

## New Tab Bar

```
Overview   ·   PM   Surfaces | Features | Flows   ·   ENG   Feature Map | Data Model | Code Organization | Code Health
```

8 tabs total. Was 7 — removed Operations, added Overview and Code Health.

### Tab Assignment

| Group | Tab | Internal ID | Was | Panel ID |
|-------|-----|-------------|-----|----------|
| Shared | **Overview** | `overview` | *new* | `overview-panel` |
| PM | Surfaces | `surfaces` | Surfaces | `surfaces-panel` |
| PM | Features | `features` | Features | `features-panel` |
| PM | Flows | `flows` | Flows | `flows-panel` |
| ENG | **Feature Map** | `featuremap` | File Tree | `filetree-panel` |
| ENG | **Data Model** | `datamodel` | Entity Map | `entities-panel` |
| ENG | **Code Organization** | `codeorg` | Code Map | `codemap-panel` |
| ENG | **Code Health** | `codehealth` | *sidebar* | `codehealth-panel` |

Default active tab on load: **Overview** (was Surfaces).

---

## Change 1: Add Overview Tab

### Purpose

The "remember when you could hold your entire codebase in your head" moment. A single-screen dashboard showing the shape of the codebase at a glance.

### Layout

Full-width content area — **no sidebar**. Hide the global sidebar when this tab is active.

```
┌──────────────────────────────────────────────────────────────────┐
│  [Stats Cards Row]                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  12     │ │  23     │ │  15     │ │   8     │ │  142    │  │
│  │ Surfaces│ │Features │ │Entities │ │ Flows   │ │ Files   │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                  │
│  [Code Health Strip] (only if codeHealth data exists)            │
│  ● Co-location 92%  ·  ● DRYness 78%                   View → │
│                                                                  │
│  [Surfaces Grid — 2-3 columns]                                   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Explore Feed     │ │ Chat Thread      │ │ Admin Dashboard  │ │
│  │ user · /explore  │ │ user · /chat/... │ │ admin · /admin   │ │
│  │ 4 features       │ │ 6 features       │ │ 3 features       │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                  │
│  [Feature Breakdown by Kind]                                     │
│  Tools (3): Prompt Wizard, Creation Studio, Content Editor       │
│  Interactions (4): Like, Follow, Save, Share                     │
│  Transactions (2): Star Credits, Tipping                         │
│  Gates (1): NSFW Filter                                          │
│                                                                  │
│  [Key Flows]                                                     │
│  → User publishes a post (5 steps)                               │
│  → User sends a chat message (4 steps)                           │
│  → Admin reviews flagged content (6 steps)                       │
└──────────────────────────────────────────────────────────────────┘
```

### Content Sections

**Section 1: Stats cards row.** A row of large stat cards showing counts: Surfaces, Features, Entities, Flows, Files tracked. Each card has the count in large text (28-32px font weight 700) with the label below (12px, muted). Use a CSS grid with `repeat(auto-fit, minmax(120px, 1fr))`.

**Section 2: Code Health summary strip.** Conditional — only render if `DATA.codeHealth?.metrics` exists and has entries. A horizontal bar showing each metric as: colored dot (green/yellow/red per thresholds) + metric name + score%. Clicking any metric navigates to `switchTab('codehealth')` with that metric pre-selected. A "View →" link on the right also navigates to Code Health.

**Section 3: Surfaces overview grid.** A responsive grid of surface cards. Each card shows: surface name (bold), actor badge, route, feature count (number of features where `surfaceIds` includes this surface), entity count. Clicking a card calls `switchTab('surfaces'); setTimeout(() => selectSurface(id), 50)`. Show all surfaces — no truncation.

**Section 4: Feature breakdown by kind.** Group `DATA.features` by `kind` (tool, interaction, transaction, gate, infrastructure, workflow). For each kind, show "Kind (count): name1, name2, name3". Each feature name is a clickable link that navigates to the Features tab. Order kinds by: tool, interaction, transaction, gate, infrastructure, workflow.

**Section 5: Key flows.** Show the first 8 flows (or all if fewer than 8). Each shows: flow name, actor badge, step count. Clickable — navigates to Flows tab. If more than 8 flows, show a "View all N flows →" link that navigates to the Flows tab.

### Styling

- Background: match existing panel background (`var(--bg)` / `var(--surface)`)
- Section spacing: 32px between sections
- Section titles: 18px font-weight 700, matching existing `.surface-section-title` pattern
- Cards: `var(--surface-2)` background, `var(--border)` border, 8px border-radius, hover state with slightly lighter border
- Scrollable content area with `padding: 32px`

### New function

```
renderOverview()
```

Called by `switchTab` when `tab === 'overview'`. Renders the full dashboard into `#overview-content`.

---

## Change 2: Merge Operations into Data Model

### Current Problem

The Operations tab shows a flat list of CRUD operations grouped by entity. The Entity Map (now Data Model) shows entities and their relationships but only mentions operations in the LLM context builder — not in the visual entity detail panel. These are both entity-centric views, and Operations doesn't provide insight that isn't better served in-context on the entity.

### Changes

**Remove the Operations tab entirely:**
- Remove the `<div class="tab" data-tab="operations">` element
- Remove the `<div class="panel" id="operations-panel">`
- Remove the `renderOperations()` function
- Remove the operations branch in `renderSidebar()` (`currentTab === 'operations'`)
- Remove `.ops-content` and `.ops-group` and `.ops-group-title` CSS (keep `.op-card` styles — they're reused by Surface detail)
- Remove the operations count from `renderStats()`

**Enhance the entity detail panel in Data Model (was Entity Map):**

In the `selectEntity()` function (which renders the entity detail panel), add an Operations section after the existing Relationships section. Currently the entity detail shows: name, kind, confidence, description, source file, fields, relationships, surfaces, features. Add:

```
Operations (N)
┌────────────────────────────────────┐
│ [create]  Create User              │
│ Creates a new user account         │
│ app/api/auth/route.ts → register() │
│ Side effects: sends welcome email  │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ [update]  Update Profile           │
│ Updates user display name and bio  │
│ app/profile/actions.ts → update()  │
└────────────────────────────────────┘
```

Use the same `.op-card` markup from the old `renderOperations()`:
```html
<div class="op-card">
  <div class="op-card-header">
    <span class="detail-tag badge-${o.type}">${o.type}</span>
    <span class="op-card-name">${o.name}</span>
    <span class="detail-tag badge-${o.confidence}" style="margin-left:auto;">${o.confidence}</span>
  </div>
  <div class="op-card-desc">${o.description}</div>
  <div class="impl-path">${o.implementation.file} → ${o.implementation.function}</div>
  ${o.sideEffects.length ? `<div class="op-card-effects">Side effects: ${o.sideEffects.join('; ')}</div>` : ''}
</div>
```

Filter operations for the selected entity: `DATA.operations.filter(o => o.entityId === selectedEntityId)`.

**Update cross-tab references:**

Any `switchTab('operations')` calls in the codebase should be removed. (Grep confirms there are none — operations were never a cross-tab navigation target.)

---

## Change 3: Rename Tabs

Three tabs get renamed. Their content and behavior remain identical — only the visible label and internal tab ID change.

| Old Name | New Name | Old `data-tab` | New `data-tab` | Panel ID (unchanged) |
|----------|----------|----------------|----------------|----------------------|
| File Tree | **Feature Map** | `filetree` | `featuremap` | `filetree-panel` |
| Entity Map | **Data Model** | `entities` | `datamodel` | `entities-panel` |
| Code Map | **Code Organization** | `codemap` | `codeorg` | `codemap-panel` |

### Why the panel IDs don't change

The panel container `<div>` IDs stay the same to minimize churn. A `TAB_PANEL_MAP` object handles the tab-ID-to-panel-ID mapping instead of relying on `${tab}-panel` string interpolation:

```js
const TAB_PANEL_MAP = {
  overview: 'overview-panel',
  surfaces: 'surfaces-panel',
  features: 'features-panel',
  flows: 'flows-panel',
  featuremap: 'filetree-panel',
  datamodel: 'entities-panel',
  codeorg: 'codemap-panel',
  codehealth: 'codehealth-panel',
};
```

Update `switchTab()` to use `TAB_PANEL_MAP[tab]` instead of `\`${tab}-panel\``.

### What must be updated throughout the file

Every `currentTab === '...'` check and every `switchTab('...')` call using the old names must be updated:

- `'entities'` → `'datamodel'`
- `'codemap'` → `'codeorg'`
- `'filetree'` → `'featuremap'`
- `'operations'` → removed

This affects: `renderSidebar()`, `switchTab()` dispatch, all cross-tab navigation onclick handlers (in `selectFeature`, `selectSurface`, `selectEntity`, `selectFlow`, `renderCompartmentDetail`, `handleBarSegmentClick`, etc.).

### Update `ENG_TABS`

```js
// Was:
const ENG_TABS = new Set(['filetree', 'codemap', 'entities', 'operations']);
// Now:
const ENG_TABS = new Set(['featuremap', 'datamodel', 'codeorg', 'codehealth']);
```

---

## Change 4: Promote Code Health to a Tab

### Current Problem

Code health (co-location analysis, DRYness analysis) is a headline Cartograph value prop — "Engineers use it to spot problems and clean up vibe-coded slop." But it's hidden in a collapsible sidebar that only appears on Eng tabs. Most users will never discover it.

### What Gets Removed

The entire `eng-health-sidebar` system:

- **HTML**: `<aside class="eng-health-sidebar" id="eng-health-sidebar"></aside>`
- **CSS**: All `.eng-health-sidebar`, `.eng-health-inner`, `.eng-health-header`, `.eng-health-toggle`, `.eng-health-expanded`, `.eng-health-collapsed`, `.eng-health-mini-*` styles. Also the `.main.eng-mode .eng-health-sidebar` responsive rules.
- **JS functions**: `renderEngHealthSidebar()`, `toggleEngHealthSidebar()`, `readEngHealthCollapsePref()`, `writeEngHealthCollapsePref()`
- **State**: `engHealthSidebarCollapsed`, `ENG_HEALTH_COLLAPSE_STORAGE_KEY`
- **CSS class toggle**: `main.classList.toggle('eng-mode', isEngTab)` — remove entirely. The `.eng-mode` class was only used to show/hide the sidebar.

### What Gets Preserved (for reuse in the tab)

Keep these CSS classes (they style finding cards and metric indicators):
- `.metric-state-green`, `.metric-state-yellow`, `.metric-state-red`
- `.eng-health-score-dot`
- `.eng-health-severity-*` badges
- `.eng-health-finding-card` and its inner styles (`.eng-health-finding-title`, `.eng-health-finding-meta`, `.eng-health-finding-body`, `.eng-health-finding-reco`)
- `.eng-health-empty`
- `.health-highlight` (used by Code Organization and Feature Map tabs)

Keep these JS functions (they power cross-tab highlighting):
- `getActiveHealthFindingRef()`
- `getActiveHealthTargets()`
- `getActiveHealthCompartmentIds()`
- `isFilePathHighlightedByHealth()`
- `isCompartmentHighlightedByHealth()`
- `doesCompartmentTreeContainHealthHighlight()`
- `getMetricState()`, `getMetricById()`, `getCodeHealthMetrics()`, `ensureEngHealthMetricSelection()`
- `renderEngHealthFindingCard()` — reused in the new tab's sidebar

### Code Health Tab Layout

The Code Health tab has its **own internal sidebar** within the panel (not the global sidebar). Hide the global sidebar when this tab is active (same as Overview).

```
┌──────────────────────────────────────────────────────────────────┐
│ [Internal Sidebar — 300px]  │  [Content Area — flex:1]          │
│                             │                                    │
│ ┌─────────────────────────┐ │  Co-location                      │
│ │ ● Co-location    92%    │ │  Score: 92%                       │
│ │   8 of 103 files        │ │  92 of 103 evaluated files pass   │
│ │   are misplaced         │ │                                    │
│ └─────────────────────────┘ │  Thresholds:                      │
│ ┌─────────────────────────┐ │  ● Green ≥ 90%  ● Yellow ≥ 70%   │
│ │ ● DRYness         78%  │ │                                    │
│ │   3 duplication         │ │  ──────────────────────────────   │
│ │   clusters found        │ │                                    │
│ └─────────────────────────┘ │  (Or when a finding is selected:) │
│                             │                                    │
│ ── Findings (8) ──────     │  components/post-card.tsx          │
│                             │                                    │
│ ┌─────────────────────────┐ │  Reason: Used only by Explore     │
│ │ components/post-card    │ │  Feed surface but lives in global │
│ │ → move to app/explore   │ │  components/                     │
│ └─────────────────────────┘ │                                    │
│ ┌─────────────────────────┐ │  Consumers:                       │
│ │ lib/format-date.ts      │ │  · app/explore/page.tsx           │
│ │ → move to app/explore   │ │  · app/explore/components/feed    │
│ └─────────────────────────┘ │                                    │
│ ┌─────────────────────────┐ │  Recommendation: move             │
│ │ hooks/use-credits.ts    │ │  Target: app/explore/components/  │
│ │ → promote to features/  │ │                                    │
│ └─────────────────────────┘ │  [View in Code Organization →]    │
│                             │  [View in Feature Map →]          │
│ ...                         │                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Internal Sidebar Content (top to bottom)

1. **Scoreboard**: All metrics as clickable score cards. Each shows: color dot (green/yellow/red per thresholds), metric name, score percentage, summary text. The selected metric is highlighted. Reuse the `eng-health-score-item` card markup.

2. **Findings header**: "Findings (N)" with the count for the selected metric.

3. **Findings list**: Scrollable list of finding cards for the selected metric. Reuse `renderEngHealthFindingCard()`. Clicking a finding selects it and renders its detail in the content area.

### Content Area

**When no finding is selected (metric overview):**
- Large metric name (24px, bold)
- Score as a large number with color indicator
- Description text
- Summary text (e.g., "8 of 103 evaluated files are misplaced")
- Thresholds visualization: show green/yellow/red threshold values

**When a finding is selected (finding detail):**

For **co-location** findings:
- File path (large, monospace, bold)
- Reason text (why this file is misplaced)
- Consumer file list (full list, not truncated)
- Recommendation: action ("move" or "promote") + target path
- Cross-tab links (see below)

For **DRYness** findings:
- Title (bold)
- Severity badge (low/medium/high)
- Implementations list with file paths and descriptions
- Shared logic items
- Recommendation: target location, what to share, what to keep separate
- Cross-tab links (see below)

### Cross-Tab Navigation from Findings

Each finding detail shows navigation buttons:

- **"View in Code Organization →"** — Sets `engHealthActiveFindingKey`, calls `switchTab('codeorg')`. The Code Organization tab's render functions already call `isCompartmentHighlightedByHealth()` to apply `.health-highlight`. If highlighted compartments exist, auto-switch to graph view.

- **"View in Feature Map →"** — Sets `engHealthActiveFindingKey`, calls `switchTab('featuremap')`. The Feature Map tab's render already calls `isFilePathHighlightedByHealth()`.

Add a helper function:
```js
function navigateToFindingInTab(tabId) {
  switchTab(tabId);
  if (tabId === 'codeorg' && getActiveHealthCompartmentIds().length) {
    showCodemapGraph();
  }
}
```

### New Functions

```
renderCodeHealthTab()         — master render, calls sidebar + content
renderCodeHealthSidebar()     — renders the internal sidebar (scoreboard + findings)
renderCodeHealthContent()     — renders the content area (metric overview or finding detail)
navigateToFindingInTab(tabId) — cross-tab navigation helper
```

### New CSS

```css
.codehealth-panel-inner    — flex row container for internal sidebar + content
.codehealth-sidebar        — 300px fixed width, border-right, overflow-y auto
.codehealth-content        — flex:1, overflow-y auto, padding 32px
.codehealth-metric-hero    — large score display for metric overview
.codehealth-finding-detail — expanded finding detail layout
.codehealth-nav-btn        — cross-tab navigation button ("View in Code Organization →")
.codehealth-threshold-bar  — visual threshold indicator
```

---

## Implementation Notes

### Tab-to-Panel Mapping

Since tab IDs no longer match panel IDs 1:1, add a mapping object:

```js
const TAB_PANEL_MAP = {
  overview: 'overview-panel',
  surfaces: 'surfaces-panel',
  features: 'features-panel',
  flows: 'flows-panel',
  featuremap: 'filetree-panel',
  datamodel: 'entities-panel',
  codeorg: 'codemap-panel',
  codehealth: 'codehealth-panel',
};
```

Update `switchTab()` to use `document.getElementById(TAB_PANEL_MAP[tab])` instead of `document.getElementById(\`${tab}-panel\`)`.

### Sidebar Visibility

Two tabs hide the global sidebar: **Overview** and **Code Health** (which has its own internal sidebar).

In `switchTab()`, toggle the global sidebar:
```js
const noSidebarTabs = new Set(['overview', 'codehealth']);
document.querySelector('.sidebar').style.display = noSidebarTabs.has(tab) ? 'none' : '';
// Give .content full width when sidebar is hidden
```

### Default Tab

In `init()`, change:
```js
switchTab('surfaces');
// to:
switchTab('overview');
```

### renderSidebar Updates

The `renderSidebar()` function dispatches on `currentTab`. Update all branch conditions:
- `'entities'` → `'datamodel'`
- `'codemap'` → `'codeorg'`
- `'filetree'` → `'featuremap'`
- Remove the `'operations'` branch
- Add `'overview'` branch (no-op — sidebar is hidden)
- Add `'codehealth'` branch (no-op — sidebar is hidden, tab has its own)

### switchTab Render Dispatches

Update the render calls:
```js
if (tab === 'overview') renderOverview();
if (tab === 'datamodel') renderEntityMap();
if (tab === 'codeorg') renderCodemapView();
if (tab === 'featuremap') renderFileTreeContent();
if (tab === 'codehealth') renderCodeHealthTab();
// Remove: if (tab === 'operations') renderOperations();
```

### renderStats

Remove the operations count. Keep: Surfaces, Features, Entities, Relationships, Flows, Compartments, Files.

### Remove eng-mode Class Toggle

The `.eng-mode` class on `.main` was only used to show/hide the eng-health-sidebar. With the sidebar removed, remove the class toggle entirely:
```js
// Remove this line from wherever it appears:
main.classList.toggle('eng-mode', isEngTab);
```

And remove the `.main.eng-mode` CSS rules.

---

## Removed, Modified, and Added Summary

### Removed
- Operations tab: HTML panel, tab button, `renderOperations()`, operations sidebar branch, `.ops-content`/`.ops-group`/`.ops-group-title` CSS
- Eng Health sidebar: HTML aside element, all sidebar-specific CSS (`.eng-health-sidebar`, `.eng-health-inner`, `.eng-health-header`, `.eng-health-toggle`, `.eng-health-expanded`, `.eng-health-collapsed`, `.eng-health-mini-*`), `renderEngHealthSidebar()`, `toggleEngHealthSidebar()`, collapsed state management (`engHealthSidebarCollapsed`, localStorage functions), `.eng-mode` class toggling and CSS rules

### Modified
- Tab bar HTML (new order, renamed tabs, new tabs)
- `switchTab()` (tab-to-panel mapping via `TAB_PANEL_MAP`, sidebar visibility, render dispatches)
- `ENG_TABS` set (new tab IDs)
- `renderSidebar()` (renamed tab checks, removed operations branch)
- `selectEntity()` (add operations section to detail panel)
- `renderStats()` (remove operations count)
- `init()` (default to overview)
- All `switchTab('entities'/'codemap'/'filetree')` calls throughout the file → renamed
- `renderEngHealthFocusNotice()` (update tab name references in text)

### Added
- Overview tab: panel HTML, `renderOverview()`, overview CSS
- Code Health tab: panel HTML with internal sidebar + content, `renderCodeHealthTab()`, `renderCodeHealthSidebar()`, `renderCodeHealthContent()`, `navigateToFindingInTab()`, Code Health CSS
- `TAB_PANEL_MAP` object

---

## Spec File Updates

These existing spec files reference old tab names and need updating:

### `spec-file-tree.md`
- References to "File Tree" tab → "Feature Map"
- Tab order references → update to new position

### `spec-code-map.md`
- References to "Code Map" → "Code Organization"
- Tab order references → update to new position

### `spec-code-health.md`
- The entire "Visualizer: Eng Sidebar" section must be rewritten to describe the Code Health tab layout instead
- References to sidebar rendering → tab rendering

### `spec-tab-grouping-and-onboarding.md`
- Tab assignment table → update to 8 tabs with new names
- Tab bar examples → update
- Future considerations → remove "Code Doctor / Health indicators" (now implemented as Code Health tab)

### `spec-visualizer-refactor.md`
- Tab bar HTML template → update to new 8-tab layout
- TABS registry → update tab module names
- Extraction order → update for renamed/new tabs
- File structure → add `tabs/overview.js` and `tabs/codehealth.js`, remove `tabs/operations.js`

### `references/json-schema.md`
- Any descriptive mentions of "File Tree tab", "Entity Map", "Code Map" → update to new names
- No schema changes needed

---

## Implementation Order

Dependencies between changes dictate this order:

1. **Tab renaming + reordering** (foundation — everything depends on this)
2. **Merge Operations into Data Model** (independent, small scope)
3. **Remove Eng Health Sidebar** (must come before adding Code Health tab)
4. **Add Overview tab** (independent of 2 and 3)
5. **Add Code Health tab** (depends on 3)
6. **Update spec files** (last — references stabilize after implementation)

---

## Edge Cases

- **No codeHealth data**: Overview hides the health strip. Code Health tab shows "No code health data. Re-run Cartograph with the health pass enabled." (reuse existing `.eng-health-empty` pattern).
- **No fileTree data**: Feature Map shows existing empty state message. Overview still works (file count from compartments).
- **No compartments data**: Code Organization shows existing empty state. Overview still works (omit or show 0).
- **Zero operations for an entity**: Data Model entity detail simply omits the Operations section (same pattern as existing sections).
- **Tab bar overflow on narrow screens**: 8 tabs + two group labels may overflow on narrow desktop windows. Match existing behavior — if tabs wrapped before, they wrap now. Consider reducing label font size or abbreviating group labels if needed.
- **Cross-tab health highlight stale state**: When navigating away from Code Health tab, clear `engHealthActiveFindingKey` so highlights don't persist unexpectedly across unrelated tab switches. Only set it when the user explicitly clicks "View in ..." from a finding.

---

## Success Criteria

1. Overview is the default landing tab and shows a complete codebase summary.
2. Code Health is discoverable as a first-class tab — no sidebar hunting.
3. Operations data is accessible in-context on entity detail views.
4. All renamed tabs work correctly with cross-tab navigation.
5. All "Copy as LLM context" buttons continue working.
6. No console errors with missing optional data (codeHealth, fileTree, compartments).
7. The visualizer loads and renders correctly with existing `cartograph.json` files (backwards compatible).
