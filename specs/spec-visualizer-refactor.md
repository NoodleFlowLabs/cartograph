# Visualizer ES Modules Refactor Spec

## Overview

Refactor the monolithic `assets/visualizer.html` (~3000 lines of HTML, CSS, and JS in a single file) into a modular ES modules architecture served via a local dev server. The refactored visualizer auto-loads `cartograph.json` on startup, supports manual file loading as a fallback, and organizes code into one-file-per-tab modules with a shared state store. This fully replaces the old monolithic file — no standalone/file:// fallback is maintained.

## Goals

- Split the monolith into ~12 focused files, each under 400 lines, so tabs can be maintained and extended independently.
- Use standard ES modules (`import`/`export`) for proper encapsulation — no global scope pollution.
- Auto-load `cartograph.json` from the server so users don't need to manually pick a file.
- Preserve all existing functionality: all 7 tabs, drag-and-drop loading, LLM context export, entity force graph, exposure matrix, etc.
- Make adding new tabs trivial: create a module, export the standard interface, register it in `main.js`.

## Non-Goals

- No framework (React, Vue, etc.) — stays vanilla JS.
- No build step — ES modules are served directly by the dev server.
- No file:// fallback — a local server is required.
- No URL-based state management — refreshing always re-auto-loads the default JSON.
- No redesign of existing tab UIs — this is a structural refactor, not a visual overhaul.

## Server

Start with `npx serve .` from the repo root. Zero-install (npx downloads on demand), serves everything, auto-picks a port. The user navigates to `http://localhost:<port>/assets/visualizer/index.html`.

The SKILL.md instructions should say:

```
Run `npx serve .` from the repo root and open http://localhost:3000/assets/visualizer/index.html
```

## File Structure

```
assets/visualizer/
  index.html              # HTML shell: <head>, tab bar, panel containers, welcome screen
  css/
    base.css              # CSS variables, reset, layout, header, tabs, sidebar, detail panel,
                          #   welcome screen, scrollbar, shared components (badges, tags, links, etc.)
    tabs.css              # All tab-specific styles: overview, surface view, feature view,
                          #   data model, flow view, code organization, code health,
                          #   feature map, exposure matrix
  js/
    main.js               # Entry point: imports all tabs, sets up tab registry, init(),
                          #   file loading (auto-fetch + welcome screen + picker), tab switching
    state.js              # Shared mutable state object + computed helpers (entitySurfaceMap,
                          #   exposure levels, color maps)
    sidebar.js            # renderSidebar() dispatcher — calls the active tab's sidebar renderer
    llm-context.js        # All "Copy as LLM context" builders and copy-to-clipboard handlers
                          #   (surface, feature, entity, flow, compartment contexts)
    tabs/
      surfaces.js         # Surface tab: selectSurface, renderSurfaceContent, exposure matrix
      features.js         # Feature tab: selectFeature, renderFeatureContent, file map prompt
      overview.js         # Overview tab: dashboard summary, code health strip, cross-tab links
      entities.js         # Data Model tab: force-directed graph, SVG rendering, pan/zoom/drag,
                          #   entity detail panel
      flows.js            # Flows tab: selectFlow, renderFlowContent, step timeline
      codemap.js          # Code Organization tab: compartment tree, dependency graph toggle,
                          #   compartment detail view, graph rendering
      codehealth.js       # Code Health tab: metric sidebar, finding detail, cross-tab nav
      filetree.js         # Feature Map tab: tree building, weight aggregation, color palette,
                          #   legend panel, feature bars, tooltips
```

## Architecture

### Module Pattern

Each tab module exports a standard interface:

```js
// tabs/surfaces.js
import { state } from '../state.js';

export function renderSidebar(listEl) { ... }
export function renderContent() { ... }
export function onTabActivated() { ... }  // called when switching to this tab
```

### Tab Registry

`main.js` imports all tab modules and registers them in a `TABS` object:

```js
import * as surfaces from './tabs/surfaces.js';
import * as features from './tabs/features.js';
import * as overview from './tabs/overview.js';
import * as entities from './tabs/entities.js';
import * as flows from './tabs/flows.js';
import * as codemap from './tabs/codemap.js';
import * as codehealth from './tabs/codehealth.js';
import * as filetree from './tabs/filetree.js';

const TABS = { overview, surfaces, features, entities, flows, codemap, codehealth, filetree };

export function switchTab(name) {
  state.currentTab = name;
  // update tab bar active states
  // hide all panels, show the active one
  // call TABS[name].onTabActivated() if defined
  // call sidebar.renderSidebar()
}
```

### Shared State

`state.js` exports a single mutable state object:

```js
export const state = {
  data: null,                    // the loaded cartograph JSON
  currentTab: 'surfaces',
  searchQuery: '',

  // Per-tab selection state
  selectedSurfaceId: null,
  selectedFeatureId: null,
  selectedEntityId: null,
  selectedFlowId: null,
  selectedCompartmentId: null,
  selectedFileTreePath: null,

  // Per-tab UI state
  expandedCompartments: {},      // id -> bool
  expandedFileTreeDirs: {},      // path -> bool
  codemapView: 'tree',           // 'tree' | 'graph'
  fileTreeColorMap: {},           // featureId -> color
  fileTreeHighlightedFeature: null,
  fileTreeLegendCollapsed: false,

  // Computed (populated by computeEntitySurfaceMap)
  entitySurfaceMap: {},          // entityId -> [surfaceId, ...]
};

export function computeEntitySurfaceMap() { ... }
export function getExposureLevel(entityId) { ... }
export function getExposureLabel(entityId) { ... }
```

Tabs import `state` and read/write it directly. After mutating state, tabs call their own render functions to update the DOM.

### Sidebar Dispatcher

`sidebar.js` imports all tab modules and delegates to the active tab:

```js
import { state } from './state.js';
import { TABS } from './main.js';

export function renderSidebar() {
  const listEl = document.getElementById('sidebar-list');
  listEl.innerHTML = '';
  const tab = TABS[state.currentTab];
  if (tab && tab.renderSidebar) {
    tab.renderSidebar(listEl);
  }
}
```

### Cross-Tab Navigation

Tabs need to navigate to other tabs (e.g., clicking a feature in the Surfaces tab navigates to the Features tab). They do this by importing `switchTab` from `main.js` and the target tab's selection function:

```js
import { switchTab } from '../main.js';
// In a click handler:
switchTab('features');
setTimeout(() => selectFeature(featureId), 50);
```

This preserves the existing pattern from the monolithic version.

## Data Loading

### Startup Flow

1. `main.js` runs on page load.
2. Attempts `fetch('/cartograph.json')`.
3. **On success**: parse JSON, set `state.data`, transition from the welcome screen to the main tab UI, call `init()` (which renders stats, sets up tabs, activates the default tab).
4. **On failure** (404, network error, parse error): show the welcome screen with the file drop area and error state.

### Welcome Screen / File Loader

The default empty state is a full-screen onboarding screen with:
- Cartograph brand/title and a short tagline
- Value-prop bullets plus a "How to get started" section
- Centered file drop area with a browse button
- Drag-and-drop support (dragover/drop events)
- Error message area for invalid JSON
- Hidden `<input type="file" accept=".json">`

### Header "Load File" Button

After data is loaded, the header shows a small "Load file..." button (styled like the existing codemap toggle buttons). Clicking it opens the native file picker. When a new file is loaded:
- Parse JSON
- Replace `state.data`
- Re-run `init()` to re-render everything
- Update the displayed file name in the header

### Displayed File Name

The header shows the name of the currently loaded file next to the stats: e.g., "cartograph.json" (for auto-loaded) or "my-other-scan.json" (for manually loaded). This helps the user know which file they're viewing.

## CSS Organization

### base.css

Contains:
- CSS custom properties (`:root` variables — colors, fonts, radius)
- Reset (`* { margin: 0; ... }`)
- Body styles
- Header (`.header`, `.header-left`, `.logo`, `.stats`, `.stat-val`)
- Tab bar (`.tabs`, `.tab`, `.tab.active`)
- Layout (`.main`, `.sidebar`, `.content`, `.panel`)
- Sidebar shared styles (`.sidebar-search`, `.sidebar-list`, `.sidebar-item`, `.sidebar-badge`, `.sidebar-label`)
- Detail panel (`.detail-panel`, `.detail-header`, `.detail-title`, `.detail-section`, etc.)
- Shared components (`.detail-tag`, `.field-row`, `.detail-link`, `.impl-path`, badges)
- Drop zone (`.drop-zone-overlay`, `.drop-zone`, etc.)
- Scrollbar styles
- Empty state (`.empty-state`)

### tabs.css

Contains all tab-specific styles, organized with section comments:
- `/* -- Surface View -- */`
- `/* -- Feature View -- */`
- `/* -- Overview -- */`
- `/* -- Data Model / Graph -- */`
- `/* -- Flow View -- */`
- `/* -- Code Organization -- */`
- `/* -- Code Health Tab -- */`
- `/* -- Feature Map -- */`
- `/* -- Exposure Matrix -- */`

## index.html

The HTML file is a thin shell (~80-100 lines):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cartograph</title>
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/tabs.css">
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="logo">Cartograph <span>v0</span></div>
    </div>
    <div class="stats" id="stats"></div>
    <div class="header-right" id="header-right"></div>
  </div>

  <!-- Tab bar -->
  <div class="tabs" id="tab-bar">
    <div class="tab-cluster tab-cluster-standalone" data-group="overview">
      <div class="tab-cluster-items">
        <div class="tab active" data-tab="overview">Overview</div>
      </div>
    </div>
    <span class="tab-group-label" aria-hidden="true">PM</span>
    <div class="tab" data-tab="surfaces">Surfaces</div>
    <div class="tab" data-tab="features">Features</div>
    <div class="tab" data-tab="flows">Flows</div>
    <span class="tab-group-gap" aria-hidden="true"></span>
    <span class="tab-group-label" aria-hidden="true">Eng</span>
    <div class="tab" data-tab="featuremap">Feature Map</div>
    <div class="tab" data-tab="datamodel">Data Model</div>
    <div class="tab" data-tab="codeorg">Code Organization</div>
    <div class="tab" data-tab="codehealth">Code Health</div>
  </div>

  <!-- Main layout -->
  <div class="main">
    <div class="sidebar">
      <div class="sidebar-search">
        <input type="text" id="search" placeholder="Search...">
      </div>
      <div class="sidebar-list" id="sidebar-list"></div>
    </div>
    <div class="content" id="content">
      <div class="panel active" id="overview-panel" style="flex-direction:row;"></div>
      <div class="panel" id="surfaces-panel" style="flex-direction:row;"></div>
      <div class="panel" id="features-panel" style="flex-direction:row;"></div>
      <div class="panel" id="entities-panel" style="flex-direction:row;"></div>
      <div class="panel" id="flows-panel" style="flex-direction:row;"></div>
      <div class="panel" id="codemap-panel" style="flex-direction:row;"></div>
      <div class="panel" id="filetree-panel" style="flex-direction:row;"></div>
      <div class="panel" id="codehealth-panel" style="flex-direction:row;"></div>
    </div>
  </div>

  <!-- Welcome screen / file loader -->
  <div class="drop-zone-overlay" id="drop-zone-overlay">
    <!-- ... onboarding copy + drop area ... -->
  </div>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

## Migration Plan

### Step-by-step approach

The refactor should be done incrementally to avoid a big-bang rewrite:

1. **Create the directory structure** — `assets/visualizer/` with `index.html`, `css/`, `js/`, `js/tabs/`.
2. **Extract CSS** — Split the `<style>` block into `base.css` and `tabs.css`. No logic changes.
3. **Create state.js** — Move all state variables and computed helpers.
4. **Create main.js** — Implement init, file loading (auto-fetch + welcome screen + picker), tab switching, search setup. Start with an empty TABS registry.
5. **Extract one tab at a time** — Start with the simplest (Overview or Flows), then Surfaces, Features, Code Health, Code Organization, Data Model, Feature Map. For each:
   - Move the rendering and selection functions into `tabs/<name>.js`
   - Export the standard interface (`renderSidebar`, `renderContent`, `onTabActivated`)
   - Import `state` and any cross-tab navigation functions
   - Register in the TABS object in `main.js`
   - Test that tab works before moving to the next
6. **Extract sidebar.js** — Move the dispatcher.
7. **Extract llm-context.js** — Move all context builders and copy handlers.
8. **Delete the old `assets/visualizer.html`**.
9. **Update SKILL.md** — Change the output instructions to reference the new path and server command.

### Recommended extraction order (simplest to most complex)

1. `overview.js` — Dashboard summary and cross-tab links. Good first extraction to prove the pattern.
2. `flows.js` — Simple select + render, timeline UI.
3. `surfaces.js` — Select + render, plus the exposure matrix (a sub-view).
4. `features.js` — Select + render, file map prompt, compartment links.
5. `codehealth.js` — Metric sidebar + finding detail, moderate complexity.
6. `codemap.js` — Compartment tree in sidebar, detail view + graph view toggle. Medium complexity.
7. `filetree.js` — Tree building, aggregation, color palette, legend. Medium-high complexity.
8. `entities.js` — Force-directed graph with SVG, pan/zoom/drag. Most complex due to the physics simulation and SVG manipulation.

## Edge Cases

- **Server not running**: User opens the HTML file directly → ES module imports fail. The page shows nothing. Not a supported scenario — the SKILL.md instructions require a server.
- **cartograph.json doesn't exist yet**: Auto-fetch returns 404 → drop zone is shown. User can still load a file manually.
- **Invalid JSON**: Parse error → drop zone shows an error message ("Invalid JSON: ...").
- **Missing fileTree key**: Feature Map tab shows "No file tree data" message. Other tabs unaffected.
- **Missing compartments key**: Code Organization tab shows "No compartment data" message. Features tab falls back to file map.
- **Very large cartograph.json**: No streaming needed — the file is typically <1MB. Standard `fetch` + `JSON.parse` is fine.
- **Multiple tabs referencing the same function**: Cross-tab utilities (like `switchTab`, `getExposureLevel`) are imported from their defining module. No circular dependency issues as long as state.js doesn't import from tab modules.
- **Browser caching**: During development, the server may cache JS files. `npx serve` sets appropriate headers. If stale, hard-refresh (Cmd+Shift+R) works.

## Success Criteria

1. All 8 tabs function identically to the monolithic version.
2. No file is longer than 400 lines.
3. `index.html` is under 100 lines.
4. Adding a new tab requires: one new file in `js/tabs/`, one import + registration in `main.js`, one `<div class="panel">` in `index.html`, and one `<div class="tab">` in the tab bar. No other files need modification.
5. Auto-load works when the server is started from the repo root.
6. Drop zone fallback works when `cartograph.json` doesn't exist.
7. "Load file..." button in the header allows switching to a different JSON file.
8. The old `assets/visualizer.html` is deleted.

## SKILL.md Changes

Update the output section (Wave 5) from:

```
Tell the user: "Open the visualizer (assets/visualizer.html in this skill's directory) in your browser and load cartograph.json via the file picker."
```

To:

```
Tell the user: "Run `npx serve .` from the repo root and open http://localhost:3000/assets/visualizer/index.html — it will auto-load cartograph.json."
```
