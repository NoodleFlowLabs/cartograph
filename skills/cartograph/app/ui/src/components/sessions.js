import { html } from '../lib/html.js'

export const mappingSession = {
  name: 'Mapping',
  slug: 'mapping',
}

export function SessionsRail({
  creating,
  error,
  onCreateSession,
  onSelectSession,
  selectedSlug,
  sessions,
}) {
  function handleKeyDown(event) {
    if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) return
    event.preventDefault()
    if (!creating) onCreateSession()
  }

  return html`<aside class="sessions-rail" onKeyDown=${handleKeyDown}>
    <div class="sessions-rail-top">
      <div class="sessions-rail-title">Sessions</div>
      <button
        aria-label="Create session"
        class="session-create-btn"
        disabled=${creating}
        onClick=${onCreateSession}
        title="Create session"
        type="button"
      >
        +
      </button>
    </div>

    <div class="sessions-list">
      ${sessions.map(
        (session) => html`<button
          class=${`session-item ${session.slug === selectedSlug ? 'active' : ''}`}
          key=${session.slug}
          onClick=${() => onSelectSession(session.slug)}
          type="button"
        >
          <span class="session-name">${session.name}</span>
        </button>`,
      )}
    </div>

    ${error ? html`<div class="sessions-error">${error}</div>` : null}
  </aside>`
}

export function EmptySessionPanel({ session }) {
  return html`<section class="session-empty-panel">
    <h1>${session.name}</h1>
  </section>`
}
