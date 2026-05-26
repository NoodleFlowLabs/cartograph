import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { formatter, tabs } from './config.js'
import { html } from './lib/html.js'
import { arr, getVisibleTabs, isRecord, normalizeData, text } from './lib/data.js'
import { InvariantBadge, Stat } from './components/common.js'
import { Sidebar } from './components/sidebar.js'
import { Welcome } from './components/welcome.js'
import { Panel } from './views/panel.js'

export function App() {
  const [loadState, setLoadState] = useState({ status: 'loading' })
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef(null)
  const sourceModeRef = useRef('server')
  const data = loadState.status === 'ready' ? loadState.data : null
  const visibleTabs = useMemo(() => getVisibleTabs(data), [data])
  const displayTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : 'overview'
  const activeConfig = visibleTabs.find((tab) => tab.id === displayTab)

  function setLoadStateForSource(sourceMode, nextState) {
    sourceModeRef.current = sourceMode
    setLoadState(nextState)
  }

  const loadCartograph = useCallback(async ({ forceServer = false } = {}) => {
    if (forceServer) {
      setLoadStateForSource('server', { status: 'loading' })
    }

    try {
      const response = await fetch('/api/cartograph')
      const body = await response.json().catch(() => null)

      if (sourceModeRef.current !== 'server') return

      if (response.status === 404) {
        setLoadStateForSource('server', {
          status: 'missing',
          message:
            text(body, 'error') ||
            'No .cartograph/mapping.json found. Run /cartograph from your agent.',
        })
        return
      }

      if (!response.ok || !isRecord(body)) {
        setLoadStateForSource('server', {
          status: 'error',
          message: text(body, 'error') || `Request failed with ${response.status}`,
        })
        return
      }

      setLoadStateForSource('server', {
        status: 'ready',
        data: normalizeData(body),
        lastUpdated: new Date(),
        source: 'local server',
      })
    } catch (error) {
      if (sourceModeRef.current !== 'server') return

      setLoadStateForSource('server', {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadCartograph()
    }, 0)

    const events = new EventSource('/api/cartograph/stream')
    events.addEventListener('cartograph-changed', () => {
      if (sourceModeRef.current === 'server') void loadCartograph()
    })

    return () => {
      window.clearTimeout(initialLoad)
      events.close()
    }
  }, [loadCartograph])

  function switchTab(tabId, nextSelectedId) {
    setActiveTab(tabId)
    setSelectedId(nextSelectedId ?? null)
    setSearch('')
  }

  async function loadDroppedFile(file) {
    if (!file) return
    sourceModeRef.current = 'file'

    try {
      const parsed = JSON.parse(await file.text())
      if (!isRecord(parsed)) throw new Error('Expected a JSON object')
      setLoadStateForSource('file', {
        status: 'ready',
        data: normalizeData(parsed),
        lastUpdated: new Date(),
        source: file.name,
      })
      setActiveTab('overview')
      setSelectedId(null)
      setSearch('')
    } catch (error) {
      setLoadStateForSource('file', {
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

  function showWelcome() {
    setLoadStateForSource('welcome', { status: 'welcome' })
    setActiveTab('overview')
    setSelectedId(null)
    setSearch('')
  }

  function openFilePicker() {
    fileInput.current?.click()
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
      onRefresh=${() => loadCartograph({ forceServer: true })}
    />`
  }

  return html`<main class="app-shell">
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
        <span>source ${loadState.source}</span>
        <span>updated ${formatter.format(loadState.lastUpdated)}</span>
      </div>
      <div class="header-actions">
        <button class="secondary-btn" onClick=${showWelcome} type="button">
          Welcome
        </button>
        <button class="secondary-btn" onClick=${openFilePicker} type="button">
          Change JSON
        </button>
        <input
          accept=".json,application/json"
          hidden
          onChange=${(event) => {
            void loadDroppedFile(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
          ref=${fileInput}
          type="file"
        />
      </div>
    </header>

    <nav class="tabs" aria-label="Cartograph sections">
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
          ${group !== 'overview'
            ? html`<span class="tab-group-label">${group}</span>`
            : null}
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
    </nav>

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
    </div>
  </main>`
}
