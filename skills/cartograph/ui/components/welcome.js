import { html } from '../vendor/htm-preact-standalone.module.js'
import { PreviewStat } from './common.js'

export function Welcome({
  dragging,
  loadState,
  onDragLeave,
  onDragOver,
  onDrop,
  onFile,
  onRefresh,
}) {
  const message =
    loadState.status === 'loading'
      ? 'Connecting to the local Cartograph server.'
      : loadState.status === 'missing' || loadState.status === 'error'
        ? loadState.message
        : ''

  return html`
    <main className="welcome-shell">
      <div className="welcome-logo">
        <img src="/cartograph-logo.svg" width="28" height="28" alt="" />
        <span>Cartograph</span>
      </div>

      <section className="preview-dashboard">
        <div className="preview-mock-banner">Sample dashboard</div>
        <div className="preview-stats">
          <${PreviewStat} label="Surfaces" value="12" />
          <${PreviewStat} label="Features" value="47" />
          <${PreviewStat} label="Entities" value="28" />
          <${PreviewStat} label="Flows" value="8" />
        </div>
        <div className="preview-flow">
          <span>Signup</span>
          <span>Verify</span>
          <span>Onboard</span>
          <span>Dashboard</span>
        </div>
      </section>

      <div
        className=${`drop-zone ${dragging ? 'dragover' : ''}`}
        onDragLeave=${onDragLeave}
        onDragOver=${onDragOver}
        onDrop=${onDrop}
      >
        <div className="drop-zone-title">
          Drop <code>cartograph.json</code> here
        </div>
        <div className="drop-zone-sub">
          Or use the local server with <code>node skills/cartograph/server.mjs</code>
        </div>
        <label className="drop-zone-btn">
          Browse files
          <input
            accept=".json,application/json"
            hidden
            onChange=${(event) => onFile(event.currentTarget.files?.[0])}
            type="file"
          />
        </label>
        <button className="secondary-btn" onClick=${onRefresh} type="button">
          Refresh local data
        </button>
        ${message ? html`<div className="drop-zone-error">${message}</div>` : null}
      </div>
    </main>
  `
}
