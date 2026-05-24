import { html } from '../lib/html.js'
import { PreviewStat } from './common.js'

export function Welcome({ dragging, loadState, onDragLeave, onDragOver, onDrop, onFile, onRefresh }) {
  const message =
    loadState.status === 'loading'
      ? 'Connecting to the local Cartograph server.'
      : loadState.status === 'missing' || loadState.status === 'error'
        ? loadState.message
        : ''

  return html`<main class="welcome-shell">
    <div class="welcome-logo">
      <img src="/cartograph-logo.svg" width="28" height="28" alt="" />
      <span>Cartograph</span>
    </div>

    <section class="preview-dashboard">
      <div class="preview-mock-banner">Sample dashboard</div>
      <div class="preview-stats">
        <${PreviewStat} label="Surfaces" value="12" />
        <${PreviewStat} label="Features" value="47" />
        <${PreviewStat} label="Entities" value="28" />
        <${PreviewStat} label="Flows" value="8" />
      </div>
      <div class="preview-flow">
        <span>Signup</span>
        <span>Verify</span>
        <span>Onboard</span>
        <span>Dashboard</span>
      </div>
    </section>

    <div
      class=${`drop-zone ${dragging ? 'dragover' : ''}`}
      onDragLeave=${onDragLeave}
      onDragOver=${onDragOver}
      onDrop=${onDrop}
    >
      <div class="drop-zone-title">Drop <code>cartograph.json</code> here</div>
      <div class="drop-zone-sub">
        Or use the local server with <code>npm --prefix skills/cartograph/app start</code>
      </div>
      <label class="drop-zone-btn">
        Browse files
        <input
          accept=".json,application/json"
          hidden
          onChange=${(event) => onFile(event.target.files?.[0])}
          type="file"
        />
      </label>
      <button class="secondary-btn" onClick=${onRefresh} type="button">
        Refresh local data
      </button>
      ${message ? html`<div class="drop-zone-error">${message}</div>` : null}
    </div>
  </main>`
}
