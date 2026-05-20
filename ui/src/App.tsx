import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: unknown; lastUpdated: Date }
  | { status: 'missing'; message: string }
  | { status: 'error'; message: string }

const formatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })

  const loadCartograph = useCallback(async () => {
    try {
      const response = await fetch('/api/cartograph')
      const body = await response.json().catch(() => null)

      if (response.status === 404) {
        setLoadState({
          status: 'missing',
          message:
            body?.error ??
            'No cartograph.json found. Run /cartograph from your agent.',
        })
        return
      }

      if (!response.ok) {
        setLoadState({
          status: 'error',
          message: body?.error ?? `Request failed with ${response.status}`,
        })
        return
      }

      setLoadState({ status: 'ready', data: body, lastUpdated: new Date() })
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

  const summary = useMemo(() => summarizeCartograph(loadState), [loadState])

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Cartograph local UI</p>
          <h1>React foundation</h1>
        </div>
        <span className={`status status-${loadState.status}`}>
          {summary.statusLabel}
        </span>
      </header>

      <section className="panel">
        <div>
          <h2>{summary.heading}</h2>
          <p>{summary.description}</p>
        </div>

        {loadState.status === 'ready' ? (
          <dl className="metrics" aria-label="Cartograph summary">
            {summary.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section className="panel panel-muted">
        <h2>Runtime endpoints</h2>
        <ul>
          <li>
            <code>GET /api/cartograph</code>
          </li>
          <li>
            <code>GET /api/cartograph/stream</code>
          </li>
          <li>
            <code>POST /api/cartograph/save</code>
          </li>
          <li>
            <code>POST /api/invariants/save</code>
          </li>
        </ul>
      </section>
    </main>
  )
}

function summarizeCartograph(loadState: LoadState) {
  if (loadState.status === 'loading') {
    return {
      description: 'Connecting to the local Cartograph server.',
      heading: 'Loading cartograph.json',
      metrics: [],
      statusLabel: 'Loading',
    }
  }

  if (loadState.status === 'missing') {
    return {
      description: loadState.message,
      heading: 'No map found',
      metrics: [],
      statusLabel: 'Missing',
    }
  }

  if (loadState.status === 'error') {
    return {
      description: loadState.message,
      heading: 'Unable to load the map',
      metrics: [],
      statusLabel: 'Error',
    }
  }

  const record = isRecord(loadState.data) ? loadState.data : {}

  return {
    description: `Loaded at ${formatter.format(loadState.lastUpdated)}. Later PRs can replace this shell with the full visualizer port.`,
    heading: 'cartograph.json is connected',
    metrics: [
      ['Surfaces', record.surfaces],
      ['Features', record.features],
      ['Flows', record.flows],
      ['Entities', record.entities],
      ['Operations', record.operations],
      ['Compartments', record.compartments],
    ].map(([label, value]) => ({
      label: String(label),
      value: Array.isArray(value) ? String(value.length) : '0',
    })),
    statusLabel: 'Live',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default App
