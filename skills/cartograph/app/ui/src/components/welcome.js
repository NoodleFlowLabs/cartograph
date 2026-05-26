import { useRef } from 'preact/hooks'
import { html } from '../lib/html.js'

export function Welcome({
  dragging,
  loadState,
  onDragLeave,
  onDragOver,
  onDrop,
  onFile,
  onRefresh,
}) {
  const fileInput = useRef(null)
  const message =
    loadState.status === 'loading'
      ? 'Connecting to the local Cartograph server.'
      : loadState.status === 'missing' || loadState.status === 'error'
        ? loadState.message
        : ''

  function openFilePicker() {
    fileInput.current?.click()
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openFilePicker()
  }

  return html`<main class="welcome-shell">
    <div class="welcome-logo">
      <img src="/cartograph-logo.svg" width="28" height="28" alt="" />
      <span class="welcome-logo-text">Cartograph</span>
    </div>

    <div class="welcome-subtitle">
      Map your codebase into surfaces, features, entities, and flows - from both PM and
      Eng perspectives.
    </div>

    <div class="welcome-features">
      <span class="welcome-feature">Explore the dashboard</span>
      <span class="welcome-feature-sep" aria-hidden="true"></span>
      <span class="welcome-feature">Audit code health</span>
      <span class="welcome-feature-sep" aria-hidden="true"></span>
      <span class="welcome-feature">Copy context for your agent</span>
    </div>

    <label
      aria-label="Load .cartograph/mapping.json"
      class=${`drop-zone ${dragging ? 'dragover' : ''}`}
      onDragLeave=${onDragLeave}
      onDragOver=${onDragOver}
      onDrop=${onDrop}
      onKeyDown=${handleKeyDown}
      role="button"
      tabindex="0"
    >
      <div class="drop-zone-title">Drop <code>mapping.json</code> here</div>
      <div class="drop-zone-sub">or browse for the generated file</div>
      <span class="drop-zone-btn">Browse files</span>
      <input
        accept=".json,application/json"
        hidden
        onChange=${(event) => {
          onFile(event.target.files?.[0])
          event.currentTarget.value = ''
        }}
        ref=${fileInput}
        type="file"
      />
      ${message ? html`<div class="drop-zone-error">${message}</div>` : null}
    </label>

    <button class="welcome-refresh secondary-btn" onClick=${onRefresh} type="button">
      Load local server file
    </button>

    <div class="welcome-footer">
      <div class="welcome-local-link">
        Open this app locally, or use the hosted${' '}
        <a href="https://cartograph.sh/visualizer" target="_blank" rel="noopener noreferrer"
          >visualizer</a
        >.
      </div>
      <a href="https://cartograph.sh" target="_blank" rel="noopener noreferrer">
        Learn more at cartograph.sh ->
      </a>
    </div>
  </main>`
}
