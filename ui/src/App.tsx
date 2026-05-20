import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { InvariantBadge, Stat } from './components/common'
import { Panel } from './components/layout/Panel'
import { Sidebar } from './components/layout/Sidebar'
import { Welcome } from './features/welcome/Welcome'
import {
  arr,
  formatter,
  getVisibleTabs,
  isRecord,
  normalizeData,
  text,
} from './lib/cartograph'
import type { LoadState, TabId } from './types'
import './App.css'

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
            'No cartograph.json found. Run /cartograph from your agent.',
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

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadCartograph()
    }, 0)

    const events = new EventSource('/api/cartograph/stream')
    events.addEventListener('cartograph-changed', () => {
      void loadCartograph()
    })

    return () => {
      window.clearTimeout(initialLoad)
      events.close()
    }
  }, [loadCartograph])

  function switchTab(tabId: TabId, nextSelectedId?: string) {
    setActiveTab(tabId)
    setSelectedId(nextSelectedId ?? null)
    setSearch('')
  }

  async function loadDroppedFile(file: File | undefined) {
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

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void loadDroppedFile(event.dataTransfer.files[0])
  }

  if (loadState.status !== 'ready' || !data) {
    return (
      <Welcome
        dragging={dragging}
        loadState={loadState}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDrop={handleDrop}
        onFile={loadDroppedFile}
        onRefresh={loadCartograph}
      />
    )
  }

  return (
    <main className="app-shell">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <img src="/cartograph-logo.svg" width="22" height="22" alt="" />
            Cartograph
          </div>
        </div>
        <div className="stats">
          <Stat label="surfaces" value={arr(data, 'surfaces').length} />
          <Stat label="features" value={arr(data, 'features').length} />
          <Stat label="entities" value={arr(data, 'entities').length} />
          <Stat label="flows" value={arr(data, 'flows').length} />
          <span>updated {formatter.format(loadState.lastUpdated)}</span>
        </div>
      </header>

      <nav className="tabs" aria-label="Cartograph sections">
        {(['overview', 'pm', 'eng'] as const).map((group) => {
          const groupTabs = visibleTabs.filter((tab) => tab.group === group)
          if (!groupTabs.length) return null

          return (
            <div
              className={`tab-cluster ${
                groupTabs.some((tab) => tab.id === displayTab)
                  ? 'active-group'
                  : ''
              }`}
              data-group={group}
              key={group}
            >
              {group !== 'overview' ? (
                <span className="tab-group-label">{group}</span>
              ) : null}
              <div className="tab-cluster-items">
                {groupTabs.map((tab) => (
                  <button
                    className={`tab ${tab.id === displayTab ? 'active' : ''}`}
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                    {tab.id === 'invariants' ? (
                      <InvariantBadge data={data} />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="main">
        {activeConfig?.sidebar ? (
          <Sidebar
            activeTab={displayTab}
            data={data}
            search={search}
            selectedId={selectedId}
            setSearch={setSearch}
            setSelectedId={setSelectedId}
          />
        ) : null}

        <section className="content">
          <Panel
            activeTab={displayTab}
            data={data}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            switchTab={switchTab}
          />
        </section>
      </div>
    </main>
  )
}

export default App
