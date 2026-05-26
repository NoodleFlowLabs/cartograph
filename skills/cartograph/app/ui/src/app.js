import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { formatter } from './config.js'
import { html } from './lib/html.js'
import { arr, getVisibleTabs, isRecord, normalizeData, text } from './lib/data.js'
import { InvariantBadge, Stat } from './components/common.js'
import { Sidebar } from './components/sidebar.js'
import { Welcome } from './components/welcome.js'
import { Panel } from './views/panel.js'

const MAIN_SESSION_SLUG = 'mapping'

export function App() {
  const [loadState, setLoadState] = useState({ status: 'loading' })
  const [sessions, setSessions] = useState([])
  const [activeSessionSlug, setActiveSessionSlug] = useState(MAIN_SESSION_SLUG)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState(false)
  const data = loadState.status === 'ready' ? loadState.data : null
  const visibleTabs = useMemo(() => getVisibleTabs(data), [data])
  const displayTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : 'overview'
  const activeConfig = visibleTabs.find((tab) => tab.id === displayTab)

  const loadCartograph = useCallback(async () => {
    try {
      const response = await fetch('/api/cartograph')
      const body = await response.json().catch(() => null)

      if (response.status === 404) {
        setLoadState({
          status: 'missing',
          message:
            text(body, 'error') ||
            'No .cartograph/mapping.json found. Run /cartograph from your agent.',
        })
        return
      }

      if (!response.ok || !isRecord(body)) {
        setLoadState({
          status: 'error',
          message: text(body, 'error') || `Request failed with ${response.status}`,
        })
        return
      }

      setLoadState({
        status: 'ready',
        data: normalizeData(body),
        lastUpdated: new Date(),
        source: 'local server',
      })
    } catch (error) {
      setLoadState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  const loadSessions = useCallback(async () => {
    const response = await fetch('/api/sessions')
    const body = await response.json().catch(() => null)

    if (!response.ok || !isRecord(body) || !Array.isArray(body.sessions)) {
      throw new Error(text(body, 'error') || `Request failed with ${response.status}`)
    }

    setSessions(body.sessions.filter(isSessionMetadata))
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadCartograph()
      void loadSessions().catch((error) => {
        console.error('Failed to load sessions', error)
      })
    }, 0)

    const events = new EventSource('/api/cartograph/stream')
    events.addEventListener('cartograph-changed', () => {
      void loadCartograph()
    })

    return () => {
      window.clearTimeout(initialLoad)
      events.close()
    }
  }, [loadCartograph, loadSessions])

  useEffect(() => {
    if (
      activeSessionSlug !== MAIN_SESSION_SLUG &&
      !sessions.some((session) => session.slug === activeSessionSlug)
    ) {
      setActiveSessionSlug(MAIN_SESSION_SLUG)
    }
  }, [activeSessionSlug, sessions])

  function switchTab(tabId, nextSelectedId) {
    setActiveTab(tabId)
    setSelectedId(nextSelectedId ?? null)
    setSearch('')
  }

  async function createSession(name) {
    const response = await fetch('/api/sessions', {
      body: JSON.stringify({ name }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    const body = await response.json().catch(() => null)

    if (!response.ok || !isRecord(body) || !isSessionMetadata(body.session)) {
      throw new Error(text(body, 'error') || `Request failed with ${response.status}`)
    }

    if (Array.isArray(body.sessions)) {
      setSessions(body.sessions.filter(isSessionMetadata))
    } else {
      setSessions((current) => [...current, body.session])
    }

    setActiveSessionSlug(body.session.slug)
  }

  async function loadDroppedFile(file) {
    if (!file) return

    try {
      const parsed = JSON.parse(await file.text())
      if (!isRecord(parsed)) throw new Error('Expected a JSON object')
      setLoadState({
        status: 'ready',
        data: normalizeData(parsed),
        lastUpdated: new Date(),
        source: file.name,
      })
      setActiveTab('overview')
      setSelectedId(null)
      setSearch('')
    } catch (error) {
      setLoadState({
        status: 'error',
        message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    void loadDroppedFile(event.dataTransfer.files[0])
  }

  if (loadState.status !== 'ready' || !data) {
    return html`<${Welcome}
      dragging=${dragging}
      loadState=${loadState}
      onDragLeave=${() => setDragging(false)}
      onDragOver=${(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDrop=${handleDrop}
      onFile=${loadDroppedFile}
      onRefresh=${loadCartograph}
    />`
  }

  const activeSession = sessions.find((session) => session.slug === activeSessionSlug)
  const showMapping = activeSessionSlug === MAIN_SESSION_SLUG || !activeSession

  return html`<main class="app-shell">
    <${SessionRail}
      activeSlug=${activeSessionSlug}
      onCreate=${createSession}
      onSelect=${setActiveSessionSlug}
      sessions=${sessions}
    />

    <section class="workspace">
      <header class="header">
        <div class="header-left">
          <div class="logo">
            <img src="/cartograph-logo.svg" width="22" height="22" alt="" />
            Cartograph
          </div>
        </div>
        <div class="stats">
          <${Stat} label="surfaces" value=${arr(data, 'surfaces').length} />
          <${Stat} label="features" value=${arr(data, 'features').length} />
          <${Stat} label="entities" value=${arr(data, 'entities').length} />
          <${Stat} label="flows" value=${arr(data, 'flows').length} />
          <span>updated ${formatter.format(loadState.lastUpdated)}</span>
        </div>
      </header>

      ${showMapping
        ? html`<${MappingWorkspace}
            activeConfig=${activeConfig}
            data=${data}
            displayTab=${displayTab}
            search=${search}
            selectedId=${selectedId}
            setSearch=${setSearch}
            setSelectedId=${setSelectedId}
            switchTab=${switchTab}
            visibleTabs=${visibleTabs}
          />`
        : html`<${SessionWorkspace} session=${activeSession} />`}
    </section>
  </main>`
}

function SessionRail({ activeSlug, onCreate, onSelect, sessions }) {
  const [draftName, setDraftName] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function submitSession(event) {
    event.preventDefault()
    const name = draftName.trim()

    if (!name) {
      setError('Name required')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      await onCreate(name)
      setDraftName('')
      setIsCreating(false)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError))
    } finally {
      setIsSaving(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      submitSession(event)
    }

    if (event.key === 'Escape') {
      setIsCreating(false)
      setDraftName('')
      setError('')
    }
  }

  return html`<aside class="session-rail" aria-label="Sessions">
    <div class="session-rail-top">
      <div class="session-rail-title">Sessions</div>
      <button
        aria-label="Create session"
        class="session-create-btn"
        onClick=${() => setIsCreating((current) => !current)}
        title="Create session"
        type="button"
      >
        +
      </button>
    </div>

    <div class="session-list">
      <button
        class=${`session-item ${activeSlug === MAIN_SESSION_SLUG ? 'active' : ''}`}
        onClick=${() => onSelect(MAIN_SESSION_SLUG)}
        type="button"
      >
        <span>Mapping</span>
      </button>

      ${sessions.map(
        (session) => html`<button
          class=${`session-item ${activeSlug === session.slug ? 'active' : ''}`}
          key=${session.slug}
          onClick=${() => onSelect(session.slug)}
          type="button"
        >
          <span>${session.name}</span>
        </button>`,
      )}
    </div>

    ${isCreating
      ? html`<form class="session-form" onSubmit=${submitSession}>
          <input
            aria-label="Session name"
            autoFocus
            disabled=${isSaving}
            onInput=${(event) => setDraftName(event.currentTarget.value)}
            onKeyDown=${handleKeyDown}
            placeholder="Session name"
            value=${draftName}
          />
          <button disabled=${isSaving} type="submit">${isSaving ? 'Adding' : 'Add'}</button>
          ${error ? html`<div class="session-form-error">${error}</div>` : null}
        </form>`
      : null}
  </aside>`
}

function MappingWorkspace({
  activeConfig,
  data,
  displayTab,
  search,
  selectedId,
  setSearch,
  setSelectedId,
  switchTab,
  visibleTabs,
}) {
  return html`<${Tabs}
      data=${data}
      displayTab=${displayTab}
      switchTab=${switchTab}
      visibleTabs=${visibleTabs}
    />
    <div class="main">
      ${activeConfig?.sidebar
        ? html`<${Sidebar}
            activeTab=${displayTab}
            data=${data}
            search=${search}
            selectedId=${selectedId}
            setSearch=${setSearch}
            setSelectedId=${setSelectedId}
          />`
        : null}

      <section class="content">
        <${Panel}
          activeTab=${displayTab}
          data=${data}
          selectedId=${selectedId}
          setSelectedId=${setSelectedId}
          switchTab=${switchTab}
        />
      </section>
    </div>`
}

function Tabs({ data, displayTab, switchTab, visibleTabs }) {
  return html`<nav class="tabs" aria-label="Cartograph sections">
    ${['overview', 'pm', 'eng'].map((group) => {
      const groupTabs = visibleTabs.filter((tab) => tab.group === group)
      if (!groupTabs.length) return null

      return html`<div
        class=${`tab-cluster ${
          groupTabs.some((tab) => tab.id === displayTab) ? 'active-group' : ''
        }`}
        data-group=${group}
        key=${group}
      >
        ${group !== 'overview' ? html`<span class="tab-group-label">${group}</span>` : null}
        <div class="tab-cluster-items">
          ${groupTabs.map(
            (tab) => html`<button
              class=${`tab ${tab.id === displayTab ? 'active' : ''}`}
              key=${tab.id}
              onClick=${() => switchTab(tab.id)}
              type="button"
            >
              ${tab.label}
              ${tab.id === 'invariants' ? html`<${InvariantBadge} data=${data} />` : null}
            </button>`,
          )}
        </div>
      </div>`
    })}
  </nav>`
}

function SessionWorkspace({ session }) {
  return html`<section class="session-workspace content">
    <div class="detail-stack session-empty">
      <header class="detail-header">
        <div>
          <h1>${session.name}</h1>
        </div>
      </header>
    </div>
  </section>`
}

function isSessionMetadata(value) {
  return isRecord(value) && Boolean(text(value, 'name')) && Boolean(text(value, 'slug'))
}
