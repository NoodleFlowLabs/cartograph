import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import './App.css'

type JsonObject = Record<string, unknown>
type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: JsonObject; lastUpdated: Date; source: string }
  | { status: 'missing'; message: string }
  | { status: 'error'; message: string }

type TabId =
  | 'overview'
  | 'surfaces'
  | 'features'
  | 'flows'
  | 'invariants'
  | 'techstack'
  | 'featuremap'
  | 'datamodel'
  | 'codeorg'
  | 'codehealth'

type TabConfig = {
  id: TabId
  label: string
  group: 'overview' | 'pm' | 'eng'
  sidebar: boolean
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', group: 'overview', sidebar: false },
  { id: 'surfaces', label: 'Surfaces', group: 'pm', sidebar: true },
  { id: 'features', label: 'Features', group: 'pm', sidebar: true },
  { id: 'flows', label: 'Flows', group: 'pm', sidebar: true },
  { id: 'invariants', label: 'Invariants', group: 'pm', sidebar: false },
  { id: 'techstack', label: 'Tech Stack', group: 'eng', sidebar: false },
  { id: 'featuremap', label: 'Feature Map', group: 'eng', sidebar: true },
  { id: 'datamodel', label: 'Data Model', group: 'eng', sidebar: true },
  { id: 'codeorg', label: 'Code Organization', group: 'eng', sidebar: true },
  { id: 'codehealth', label: 'Code Health', group: 'eng', sidebar: false },
]

const sidebarKeys: Partial<Record<TabId, string>> = {
  surfaces: 'surfaces',
  features: 'features',
  flows: 'flows',
  featuremap: 'fileTree',
  datamodel: 'entities',
  codeorg: 'compartments',
}

const formatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

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

function Welcome({
  dragging,
  loadState,
  onDragLeave,
  onDragOver,
  onDrop,
  onFile,
  onRefresh,
}: {
  dragging: boolean
  loadState: LoadState
  onDragLeave: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onFile: (file: File | undefined) => void
  onRefresh: () => void
}) {
  const message =
    loadState.status === 'loading'
      ? 'Connecting to the local Cartograph server.'
      : loadState.status === 'missing'
        ? loadState.message
        : loadState.status === 'error'
          ? loadState.message
          : ''

  return (
    <main className="welcome-shell">
      <div className="welcome-logo">
        <img src="/cartograph-logo.svg" width="28" height="28" alt="" />
        <span>Cartograph</span>
      </div>

      <section className="preview-dashboard">
        <div className="preview-mock-banner">Sample dashboard</div>
        <div className="preview-stats">
          <PreviewStat label="Surfaces" value="12" />
          <PreviewStat label="Features" value="47" />
          <PreviewStat label="Entities" value="28" />
          <PreviewStat label="Flows" value="8" />
        </div>
        <div className="preview-flow">
          <span>Signup</span>
          <span>Verify</span>
          <span>Onboard</span>
          <span>Dashboard</span>
        </div>
      </section>

      <div
        className={`drop-zone ${dragging ? 'dragover' : ''}`}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
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
            onChange={(event) => onFile(event.target.files?.[0])}
            type="file"
          />
        </label>
        <button className="secondary-btn" onClick={onRefresh} type="button">
          Refresh local data
        </button>
        {message ? <div className="drop-zone-error">{message}</div> : null}
      </div>
    </main>
  )
}

function Panel({
  activeTab,
  data,
  selectedId,
  setSelectedId,
  switchTab,
}: {
  activeTab: TabId
  data: JsonObject
  selectedId: string | null
  setSelectedId: (id: string) => void
  switchTab: (tab: TabId, selectedId?: string) => void
}) {
  if (activeTab === 'overview') {
    return <Overview data={data} switchTab={switchTab} />
  }

  if (activeTab === 'surfaces') {
    const surfaces = arr(data, 'surfaces')
    const selected = findById(surfaces, selectedId) || surfaces[0]
    return selected ? (
      <SurfaceDetail data={data} surface={selected} switchTab={switchTab} />
    ) : (
      <EmptyState label="No surfaces found." />
    )
  }

  if (activeTab === 'features') {
    const features = arr(data, 'features')
    const selected = findById(features, selectedId) || features[0]
    return selected ? (
      <FeatureDetail data={data} feature={selected} switchTab={switchTab} />
    ) : (
      <EmptyState label="No features found." />
    )
  }

  if (activeTab === 'flows') {
    const flows = arr(data, 'flows')
    const selected = findById(flows, selectedId) || flows[0]
    return selected ? (
      <FlowDetail data={data} flow={selected} switchTab={switchTab} />
    ) : (
      <EmptyState label="No flows found." />
    )
  }

  if (activeTab === 'invariants') return <InvariantsPanel data={data} />
  if (activeTab === 'techstack') return <TechStackPanel data={data} />
  if (activeTab === 'featuremap') return <FeatureMapPanel data={data} selectedId={selectedId} />

  if (activeTab === 'datamodel') {
    const entities = arr(data, 'entities')
    const selected = findById(entities, selectedId) || entities[0]
    return selected ? (
      <EntityPanel data={data} entity={selected} setSelectedId={setSelectedId} />
    ) : (
      <EmptyState label="No entities found." />
    )
  }

  if (activeTab === 'codeorg') {
    const compartments = arr(data, 'compartments')
    const selected = findById(compartments, selectedId) || compartments[0]
    return selected ? (
      <CompartmentPanel compartment={selected} data={data} setSelectedId={setSelectedId} />
    ) : (
      <EmptyState label="No compartment data found." />
    )
  }

  return <CodeHealthPanel data={data} switchTab={switchTab} />
}

function Sidebar({
  activeTab,
  data,
  search,
  selectedId,
  setSearch,
  setSelectedId,
}: {
  activeTab: TabId
  data: JsonObject
  search: string
  selectedId: string | null
  setSearch: (value: string) => void
  setSelectedId: (id: string) => void
}) {
  const key = sidebarKeys[activeTab]
  const items = key ? arr(data, key) : []
  const query = search.trim().toLowerCase()
  const filtered = items.filter((item) => searchableText(item).includes(query))

  return (
    <aside className="sidebar">
      <div className="sidebar-search">
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search..."
          value={search}
        />
      </div>
      <div className="sidebar-list">
        {filtered.map((item, index) => {
          const id = itemId(item, index)
          return (
            <button
              className={`sidebar-item ${selectedId === id || (!selectedId && index === 0) ? 'active' : ''}`}
              key={id}
              onClick={() => setSelectedId(id)}
              type="button"
            >
              <span className="sidebar-label">{itemTitle(item, activeTab)}</span>
              <span className="sidebar-meta">{itemMeta(item, activeTab)}</span>
            </button>
          )
        })}
        {!filtered.length ? <EmptyState label="No matching items." compact /> : null}
      </div>
    </aside>
  )
}

function Overview({
  data,
  switchTab,
}: {
  data: JsonObject
  switchTab: (tab: TabId, selectedId?: string) => void
}) {
  const surfaces = arr(data, 'surfaces')
  const features = arr(data, 'features')
  const flows = arr(data, 'flows')
  const entities = arr(data, 'entities')
  const metrics = arr(record(data, 'codeHealth'), 'metrics')
  const techStack = arr(data, 'techStack')
  const invariants = getInvariants(data)

  return (
    <div className="overview-stack">
      <section className="overview-stats-grid">
        <MetricCard label="Surfaces" value={surfaces.length} />
        <MetricCard label="Features" value={features.length} />
        <MetricCard label="Entities" value={entities.length} />
        <MetricCard label="Flows" value={flows.length} />
        <MetricCard label="Files" value={trackedFileCount(data)} />
      </section>

      {metrics.length ? (
        <section className="overview-strip">
          <div>
            <div className="overview-section-title">Code health</div>
            <div className="health-row">
              {metrics.map((metric) => (
                <button
                  className="health-pill"
                  key={itemId(metric)}
                  onClick={() => switchTab('codehealth')}
                  type="button"
                >
                  <span className={`score-dot ${metricState(num(metric, 'score'))}`} />
                  {text(metric, 'name') || itemId(metric)} {Math.round(num(metric, 'score'))}%
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {invariants ? (
        <section className="overview-strip">
          <div>
            <div className="overview-section-title">Invariants</div>
            <button className="health-pill" onClick={() => switchTab('invariants')} type="button">
              <span className={`score-dot ${num(invariants.summary, 'failing') > 0 ? 'red' : 'green'}`} />
              {num(invariants.summary, 'passing')}/{num(invariants.summary, 'total')} passing
            </button>
          </div>
        </section>
      ) : null}

      {techStack.length ? (
        <section className="overview-strip">
          <div>
            <div className="overview-section-title">Tech stack</div>
            <div className="chip-row">
              {techStack.slice(0, 10).map((item) => (
                <button
                  className="detail-chip"
                  key={itemId(item)}
                  onClick={() => switchTab('techstack')}
                  type="button"
                >
                  {text(item, 'name')}
                  {text(item, 'version') ? ` ${text(item, 'version')}` : ''}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="overview-section-title">Surfaces</div>
        <div className="overview-card-grid">
          {surfaces.map((surface, index) => (
            <button
              className="overview-card"
              key={itemId(surface, index)}
              onClick={() => switchTab('surfaces', itemId(surface, index))}
              type="button"
            >
              <span className="card-title">{text(surface, 'name') || 'Unnamed surface'}</span>
              <span className="card-desc">{text(surface, 'description')}</span>
              <span className="card-meta">
                <Badge>{text(surface, 'actor') || 'surface'}</Badge>
                {entryRoute(surface)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="overview-section-title">Feature breakdown</div>
        <div className="breakdown-list">
          {groupBy(features, (feature) => text(feature, 'kind') || 'other').map(
            ([kind, items]) => (
              <div className="breakdown-row" key={kind}>
                <span>{kind} ({items.length})</span>
                <div className="inline-links">
                  {items.slice(0, 8).map((feature, index) => (
                    <button
                      key={itemId(feature, index)}
                      onClick={() => switchTab('features', itemId(feature, index))}
                      type="button"
                    >
                      {text(feature, 'name')}
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section>
        <div className="overview-section-title">Key flows</div>
        <div className="overview-card-grid two">
          {flows.slice(0, 8).map((flow, index) => (
            <button
              className="overview-card"
              key={itemId(flow, index)}
              onClick={() => switchTab('flows', itemId(flow, index))}
              type="button"
            >
              <span className="card-title">{text(flow, 'name') || 'Unnamed flow'}</span>
              <span className="card-desc">{text(flow, 'description')}</span>
              <span className="card-meta">
                <Badge>{text(flow, 'actor') || 'flow'}</Badge>
                {arr(flow, 'steps').length} steps
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function SurfaceDetail({
  data,
  surface,
  switchTab,
}: {
  data: JsonObject
  surface: JsonObject
  switchTab: (tab: TabId, selectedId?: string) => void
}) {
  const features = arr(data, 'features').filter((feature) =>
    strArray(feature, 'surfaceIds').includes(itemId(surface)),
  )
  const entities = linkedItems(data, 'entities', strArray(surface, 'entityIds'))
  const operations = linkedItems(data, 'operations', strArray(surface, 'operationIds'))
  const flows = linkedItems(data, 'flows', strArray(surface, 'flowIds'))
  const compartments = linkedItems(data, 'compartments', strArray(surface, 'compartmentIds'))

  return (
    <div className="detail-stack">
      <DetailHeader
        actions={<CopyButton text={buildSurfaceContext(data, surface)} />}
        badges={[text(surface, 'actor'), text(surface, 'confidence')]}
        description={text(surface, 'description')}
        meta={[entryRoute(surface), entryFile(surface)]}
        title={text(surface, 'name') || 'Unnamed surface'}
      />

      <LinkedSection
        items={features}
        label="Features"
        onClick={(item) => switchTab('features', itemId(item))}
      />
      <LinkedSection
        items={compartments}
        label="Compartments"
        onClick={(item) => switchTab('codeorg', itemId(item))}
        subtitle={(item) => `${arr(item, 'files').length} files`}
      />
      <LinkedSection
        items={entities}
        label="Entities"
        onClick={(item) => switchTab('datamodel', itemId(item))}
        subtitle={(item) => text(item, 'kind')}
      />
      <CardSection label="Operations">
        {operations.map((operation) => (
          <InfoCard
            badges={[text(operation, 'type')]}
            description={text(operation, 'description')}
            key={itemId(operation)}
            meta={implementationLabel(operation)}
            title={text(operation, 'name')}
          />
        ))}
      </CardSection>
      <LinkedSection
        items={flows}
        label="Flows"
        onClick={(item) => switchTab('flows', itemId(item))}
        subtitle={(item) => `${arr(item, 'steps').length} steps`}
      />
    </div>
  )
}

function FeatureDetail({
  data,
  feature,
  switchTab,
}: {
  data: JsonObject
  feature: JsonObject
  switchTab: (tab: TabId, selectedId?: string) => void
}) {
  const surfaces = linkedItems(data, 'surfaces', strArray(feature, 'surfaceIds'))
  const entities = linkedItems(data, 'entities', strArray(feature, 'entityIds'))
  const compartments = linkedItems(data, 'compartments', strArray(feature, 'compartmentIds'))
  const implementations = arr(feature, 'implementations')
  const files = arr(feature, 'files')

  return (
    <div className="detail-stack">
      <DetailHeader
        actions={<CopyButton text={buildFeatureContext(data, feature)} />}
        badges={[text(feature, 'kind'), text(feature, 'confidence')]}
        description={text(feature, 'description')}
        title={text(feature, 'name') || 'Unnamed feature'}
      />

      <LinkedSection
        items={surfaces}
        label="Embedded in surfaces"
        onClick={(item) => switchTab('surfaces', itemId(item))}
        subtitle={entryRoute}
      />
      <LinkedSection
        items={entities}
        label="Entities"
        onClick={(item) => switchTab('datamodel', itemId(item))}
        subtitle={(item) => text(item, 'kind')}
      />
      <LinkedSection
        items={compartments}
        label="Compartments"
        onClick={(item) => switchTab('codeorg', itemId(item))}
        subtitle={(item) => `${arr(item, 'files').length} files`}
      />

      <CardSection label="Key implementations">
        {implementations.map((implementation, index) => (
          <InfoCard
            description={text(implementation, 'description')}
            key={itemId(implementation, index)}
            meta={text(implementation, 'file') || text(implementation, 'location')}
            title={text(implementation, 'file') || `Implementation ${index + 1}`}
          />
        ))}
      </CardSection>

      <CardSection label="File map">
        {files.length ? (
          files.map((file, index) => (
            <InfoCard
              badges={[text(file, 'role') || 'file']}
              key={itemId(file, index)}
              title={text(file, 'file') || text(file, 'path')}
            />
          ))
        ) : (
          <PromptBlock text={buildFileMapPrompt(data, feature)} />
        )}
      </CardSection>
    </div>
  )
}

function FlowDetail({
  data,
  flow,
  switchTab,
}: {
  data: JsonObject
  flow: JsonObject
  switchTab: (tab: TabId, selectedId?: string) => void
}) {
  return (
    <div className="detail-stack">
      <DetailHeader
        actions={<CopyButton text={buildFlowContext(data, flow)} />}
        badges={[text(flow, 'actor'), text(flow, 'confidence')]}
        description={text(flow, 'description')}
        meta={[text(flow, 'trigger')]}
        title={text(flow, 'name') || 'Unnamed flow'}
      />
      <ol className="step-list">
        {arr(flow, 'steps').map((step, index) => {
          const entity = findById(arr(data, 'entities'), text(step, 'entityId'))
          return (
            <li key={itemId(step, index)}>
              <div className="step-num">{num(step, 'order') || index + 1}</div>
              <div>
                <div className="step-title">{text(step, 'description')}</div>
                <div className="impl-path">{implementationLabel(step)}</div>
                {entity ? (
                  <button
                    className="inline-action"
                    onClick={() => switchTab('datamodel', itemId(entity))}
                    type="button"
                  >
                    {text(entity, 'name')}
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function EntityPanel({
  data,
  entity,
  setSelectedId,
}: {
  data: JsonObject
  entity: JsonObject
  setSelectedId: (id: string) => void
}) {
  const entities = arr(data, 'entities')
  const relationships = arr(data, 'relationships').filter(
    (relationship) =>
      text(relationship, 'from') === itemId(entity) ||
      text(relationship, 'to') === itemId(entity),
  )

  return (
    <div className="split-panel">
      <div className="graph-panel">
        {entities.slice(0, 32).map((item, index) => (
          <button
            className={`entity-node ${itemId(item) === itemId(entity) ? 'active' : ''}`}
            key={itemId(item, index)}
            onClick={() => setSelectedId(itemId(item, index))}
            style={nodeStyle(index, entities.length)}
            type="button"
          >
            <span>{text(item, 'name')}</span>
            <small>{text(item, 'kind')}</small>
          </button>
        ))}
      </div>
      <div className="detail-stack side-detail">
        <DetailHeader
          actions={<CopyButton text={buildEntityContext(data, entity)} />}
          badges={[text(entity, 'kind'), exposureLabel(data, itemId(entity))]}
          description={text(entity, 'description')}
          meta={[sourceLabel(entity)]}
          title={text(entity, 'name') || 'Unnamed entity'}
        />
        <CardSection label="Fields">
          {arr(entity, 'fields').map((field, index) => (
            <InfoCard
              description={text(field, 'description')}
              key={itemId(field, index)}
              meta={text(field, 'type')}
              title={text(field, 'name')}
            />
          ))}
        </CardSection>
        <CardSection label="Relationships">
          {relationships.map((relationship, index) => (
            <InfoCard
              badges={[text(relationship, 'type')]}
              description={text(relationship, 'description')}
              key={itemId(relationship, index)}
              title={`${text(relationship, 'from')} -> ${text(relationship, 'to')}`}
            />
          ))}
        </CardSection>
      </div>
    </div>
  )
}

function CompartmentPanel({
  compartment,
  data,
  setSelectedId,
}: {
  compartment: JsonObject
  data: JsonObject
  setSelectedId: (id: string) => void
}) {
  const children = arr(data, 'compartments').filter(
    (item) => text(item, 'parentId') === itemId(compartment),
  )
  const files = arr(compartment, 'files')

  return (
    <div className="detail-stack">
      <DetailHeader
        badges={strArray(compartment, 'tags')}
        description={text(compartment, 'description')}
        title={text(compartment, 'name') || 'Unnamed compartment'}
      />
      <LinkedSection
        items={children}
        label="Child compartments"
        onClick={(item) => setSelectedId(itemId(item))}
        subtitle={(item) => `${arr(item, 'files').length} files`}
      />
      <CardSection label={`Files (${files.length})`}>
        {files.map((file, index) => (
          <InfoCard
            badges={[text(file, 'role') || 'file']}
            description={text(file, 'description')}
            key={itemId(file, index)}
            title={text(file, 'file') || text(file, 'path')}
          />
        ))}
      </CardSection>
    </div>
  )
}

function InvariantsPanel({ data }: { data: JsonObject }) {
  const invariants = getInvariants(data)
  if (!invariants || !invariants.results.length) {
    return <EmptyState label="No invariants defined." />
  }

  return (
    <div className="detail-stack">
      <div className="summary-bar">
        <span>{num(invariants.summary, 'total')} invariants</span>
        <span className="green">{num(invariants.summary, 'passing')} passing</span>
        <span className="red">{num(invariants.summary, 'failing')} failing</span>
        <span>{num(invariants.summary, 'skipped')} skipped</span>
      </div>
      {invariants.results.map((result) => (
        <details className="invariant-card" key={itemId(result)}>
          <summary>
            <span className={`status-dot ${text(result, 'status')}`} />
            <strong>{text(result, 'name') || text(result, 'id')}</strong>
            <Badge>{text(result, 'severity') || 'invariant'}</Badge>
          </summary>
          <p>{text(result, 'summary') || text(result, 'assertion')}</p>
          <div className="chip-row">
            {strArray(result, 'tags').map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          {text(result, 'verificationPrompt') || text(result, 'fixPrompt') ? (
            <PromptBlock text={text(result, 'fixPrompt') || text(result, 'verificationPrompt')} />
          ) : null}
        </details>
      ))}
    </div>
  )
}

function TechStackPanel({ data }: { data: JsonObject }) {
  const items = arr(data, 'techStack')
  if (!items.length) return <EmptyState label="No tech stack data." />

  return (
    <div className="techstack-stack">
      {groupBy(items, (item) => text(item, 'category') || 'other').map(
        ([category, group]) => (
          <section key={category}>
            <div className="overview-section-title">{category}</div>
            <div className="tech-grid">
              {group.map((item, index) => (
                <InfoCard
                  badges={[text(item, 'confidence')]}
                  description={text(item, 'description')}
                  key={itemId(item, index)}
                  meta={text(item, 'source')}
                  title={`${text(item, 'name')}${text(item, 'version') ? ` ${text(item, 'version')}` : ''}`}
                />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  )
}

function FeatureMapPanel({
  data,
  selectedId,
}: {
  data: JsonObject
  selectedId: string | null
}) {
  const fileTree = arr(data, 'fileTree')
  if (!fileTree.length) {
    return <EmptyState label="No file tree data. Re-run cartograph to generate." />
  }

  const selected = findById(fileTree, selectedId) || fileTree[0]
  const weights = arr(selected, 'featureWeights')

  return (
    <div className="detail-stack">
      <DetailHeader
        description="The file map shows which features own or influence each file."
        title={text(selected, 'path') || text(selected, 'file') || 'Feature map'}
      />
      <CardSection label="Feature composition">
        {weights.length ? (
          weights.map((weight, index) => (
            <InfoCard
              badges={[`${Math.round(num(weight, 'weight') * 100)}%`]}
              key={itemId(weight, index)}
              title={featureName(data, text(weight, 'featureId'))}
            />
          ))
        ) : (
          <EmptyState compact label="No feature weights for this file." />
        )}
      </CardSection>
      <PromptBlock text={buildFileTreeContext(data)} />
    </div>
  )
}

function CodeHealthPanel({
  data,
  switchTab,
}: {
  data: JsonObject
  switchTab: (tab: TabId, selectedId?: string) => void
}) {
  const metrics = arr(record(data, 'codeHealth'), 'metrics')
  if (!metrics.length) return <EmptyState label="No code health data." />

  return (
    <div className="codehealth-layout">
      {metrics.map((metric) => (
        <section className="health-card" key={itemId(metric)}>
          <div className="health-card-header">
            <div>
              <h2>{text(metric, 'name')}</h2>
              <p>{text(metric, 'summary') || text(metric, 'description')}</p>
            </div>
            <span className={`health-score ${metricState(num(metric, 'score'))}`}>
              {Math.round(num(metric, 'score'))}%
            </span>
          </div>
          <div className="finding-list">
            {arr(metric, 'findings').map((finding, index) => (
              <InfoCard
                actions={
                  <button
                    className="inline-action"
                    onClick={() => switchTab('codeorg')}
                    type="button"
                  >
                    View in code
                  </button>
                }
                badges={[text(finding, 'severity'), text(finding, 'kind')]}
                description={text(finding, 'reason') || text(finding, 'summary')}
                key={itemId(finding, index)}
                meta={text(finding, 'file') || text(finding, 'target')}
                title={text(finding, 'title') || text(finding, 'target') || `Finding ${index + 1}`}
              />
            ))}
            {!arr(metric, 'findings').length ? (
              <EmptyState compact label="No findings for this metric." />
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}

function DetailHeader({
  actions,
  badges,
  description,
  meta,
  title,
}: {
  actions?: ReactNode
  badges?: Array<string | undefined>
  description?: string
  meta?: Array<string | undefined>
  title: string
}) {
  return (
    <header className="detail-header">
      <div>
        <h1>{title}</h1>
        <div className="detail-meta">
          {(badges || []).filter(Boolean).map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
          {(meta || []).filter(Boolean).map((item) => (
            <span className="impl-path" key={item}>
              {item}
            </span>
          ))}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  )
}

function LinkedSection({
  items,
  label,
  onClick,
  subtitle,
}: {
  items: JsonObject[]
  label: string
  onClick: (item: JsonObject) => void
  subtitle?: (item: JsonObject) => string
}) {
  return (
    <CardSection label={`${label} (${items.length})`}>
      {items.length ? (
        items.map((item) => (
          <button
            className="linked-item"
            key={itemId(item)}
            onClick={() => onClick(item)}
            type="button"
          >
            <span>{text(item, 'name') || itemId(item)}</span>
            {subtitle ? <small>{subtitle(item)}</small> : null}
          </button>
        ))
      ) : (
        <EmptyState compact label={`No ${label.toLowerCase()}.`} />
      )}
    </CardSection>
  )
}

function CardSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section>
      <div className="section-title">{label}</div>
      <div className="card-list">{children}</div>
    </section>
  )
}

function InfoCard({
  actions,
  badges,
  description,
  meta,
  title,
}: {
  actions?: ReactNode
  badges?: Array<string | undefined>
  description?: string
  meta?: string
  title?: string
}) {
  return (
    <div className="info-card">
      <div className="info-card-top">
        <strong>{title || 'Untitled'}</strong>
        <div className="chip-row">
          {(badges || []).filter(Boolean).map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
        </div>
      </div>
      {description ? <p>{description}</p> : null}
      {meta ? <div className="impl-path">{meta}</div> : null}
      {actions}
    </div>
  )
}

function PromptBlock({ text: prompt }: { text: string }) {
  return (
    <div className="prompt-block">
      <CopyButton text={prompt} />
      <pre>{prompt}</pre>
    </div>
  )
}

function CopyButton({ text: value }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button className="copy-btn" onClick={() => void copy()} type="button">
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function EmptyState({ compact, label }: { compact?: boolean; label: string }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}>{label}</div>
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="overview-stat-card">
      <div className="overview-stat-value">{value}</div>
      <div className="overview-stat-label">{label}</div>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="preview-stat">
      <div>{value}</div>
      <span>{label}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="stat-val">{value}</span>
      {label}
    </span>
  )
}

function Badge({ children }: { children: ReactNode }) {
  if (!children) return null
  return <span className="detail-tag">{children}</span>
}

function InvariantBadge({ data }: { data: JsonObject | null }) {
  if (!data) return null
  const invariants = getInvariants(data)
  if (!invariants) return null
  const failing = num(invariants.summary, 'failing')
  const total = num(invariants.summary, 'total')
  return (
    <span className={`tab-badge ${failing ? 'has-failures' : 'all-passing'}`}>
      {failing ? `${failing}/${total}` : total}
    </span>
  )
}

function getVisibleTabs(data: JsonObject | null): TabConfig[] {
  return tabs.filter((tab) => {
    if (tab.id !== 'invariants') return true
    return Boolean(data && getInvariants(data))
  })
}

function normalizeData(data: JsonObject): JsonObject {
  return {
    ...data,
    compartments: arr(data, 'compartments'),
    entities: arr(data, 'entities'),
    features: arr(data, 'features'),
    fileTree: arr(data, 'fileTree'),
    flows: arr(data, 'flows'),
    operations: arr(data, 'operations'),
    relationships: arr(data, 'relationships'),
    surfaces: arr(data, 'surfaces'),
    techStack: arr(data, 'techStack'),
  }
}

function getInvariants(data: JsonObject): { summary: JsonObject; results: JsonObject[] } | null {
  const invariants = record(data, 'invariants')
  const results = arr(invariants, 'results')
  if (!results.length) return null
  return { results, summary: record(invariants, 'summary') }
}

function trackedFileCount(data: JsonObject): number {
  const fileTree = arr(data, 'fileTree')
  if (fileTree.length) return fileTree.length
  const files = new Set<string>()
  arr(data, 'compartments').forEach((compartment) => {
    arr(compartment, 'files').forEach((file) => {
      const path = text(file, 'file') || text(file, 'path')
      if (path) files.add(path)
    })
  })
  return files.size
}

function linkedItems(data: JsonObject, key: string, ids: string[]): JsonObject[] {
  return ids
    .map((id) => findById(arr(data, key), id))
    .filter((item): item is JsonObject => Boolean(item))
}

function groupBy(
  items: JsonObject[],
  getKey: (item: JsonObject) => string,
): Array<[string, JsonObject[]]> {
  const grouped = new Map<string, JsonObject[]>()
  items.forEach((item) => {
    const key = getKey(item)
    grouped.set(key, [...(grouped.get(key) || []), item])
  })
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))
}

function findById(items: JsonObject[], id: string | null | undefined): JsonObject | null {
  if (!id) return null
  return items.find((item, index) => itemId(item, index) === id) || null
}

function itemId(item: JsonObject, fallback = 0): string {
  return text(item, 'id') || text(item, 'path') || text(item, 'file') || `${fallback}`
}

function itemTitle(item: JsonObject, activeTab: TabId): string {
  if (activeTab === 'featuremap') return text(item, 'path') || text(item, 'file') || 'File'
  return text(item, 'name') || text(item, 'id') || 'Untitled'
}

function itemMeta(item: JsonObject, activeTab: TabId): string {
  if (activeTab === 'surfaces') return entryRoute(item)
  if (activeTab === 'features') return text(item, 'kind')
  if (activeTab === 'flows') return `${arr(item, 'steps').length} steps`
  if (activeTab === 'datamodel') return text(item, 'kind')
  if (activeTab === 'codeorg') return `${arr(item, 'files').length} files`
  if (activeTab === 'featuremap') return `${arr(item, 'featureWeights').length} features`
  return ''
}

function searchableText(item: JsonObject): string {
  return [
    text(item, 'id'),
    text(item, 'name'),
    text(item, 'description'),
    text(item, 'path'),
    text(item, 'file'),
    entryRoute(item),
  ]
    .join(' ')
    .toLowerCase()
}

function featureName(data: JsonObject, id: string): string {
  if (id === '__infrastructure__') return 'Infrastructure'
  const feature = findById(arr(data, 'features'), id)
  return feature ? text(feature, 'name') || id : id || 'Unknown feature'
}

function entryRoute(item: JsonObject): string {
  return text(record(item, 'entrypoint'), 'route')
}

function entryFile(item: JsonObject): string {
  return text(record(item, 'entrypoint'), 'file')
}

function implementationLabel(item: JsonObject): string {
  const implementation = record(item, 'implementation')
  return [text(implementation, 'file'), text(implementation, 'function')]
    .filter(Boolean)
    .join(' -> ')
}

function sourceLabel(item: JsonObject): string {
  const source = record(item, 'source')
  return [text(source, 'file'), text(source, 'line')].filter(Boolean).join(':')
}

function exposureLabel(data: JsonObject, entityId: string): string {
  const count = arr(data, 'surfaces').filter((surface) =>
    strArray(surface, 'entityIds').includes(entityId),
  ).length
  if (count <= 1) return 'scoped'
  if (count === 2) return 'shared'
  return 'cross-cutting'
}

function metricState(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 90) return 'green'
  if (score >= 70) return 'yellow'
  return 'red'
}

function nodeStyle(index: number, total: number): React.CSSProperties {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1)
  const radius = 38
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
  }
}

function buildSurfaceContext(data: JsonObject, surface: JsonObject): string {
  const features = arr(data, 'features').filter((feature) =>
    strArray(feature, 'surfaceIds').includes(itemId(surface)),
  )
  return [
    `# Surface: ${text(surface, 'name')}`,
    '',
    text(surface, 'description'),
    '',
    `Route: ${entryRoute(surface)}`,
    `Entry file: ${entryFile(surface)}`,
    '',
    '## Features',
    ...features.map((feature) => `- ${text(feature, 'name')} (${text(feature, 'kind')})`),
  ].join('\n')
}

function buildFeatureContext(data: JsonObject, feature: JsonObject): string {
  const surfaces = linkedItems(data, 'surfaces', strArray(feature, 'surfaceIds'))
  const entities = linkedItems(data, 'entities', strArray(feature, 'entityIds'))
  return [
    `# Feature: ${text(feature, 'name')}`,
    '',
    text(feature, 'description'),
    '',
    `Kind: ${text(feature, 'kind')}`,
    '',
    '## Surfaces',
    ...surfaces.map((surface) => `- ${text(surface, 'name')} (${entryRoute(surface)})`),
    '',
    '## Entities',
    ...entities.map((entity) => `- ${text(entity, 'name')} (${text(entity, 'kind')})`),
  ].join('\n')
}

function buildFlowContext(data: JsonObject, flow: JsonObject): string {
  return [
    `# Flow: ${text(flow, 'name')}`,
    '',
    text(flow, 'description'),
    '',
    ...arr(flow, 'steps').map((step, index) => {
      const entity = findById(arr(data, 'entities'), text(step, 'entityId'))
      return `${index + 1}. ${text(step, 'description')} ${entity ? `(${text(entity, 'name')})` : ''}`
    }),
  ].join('\n')
}

function buildEntityContext(data: JsonObject, entity: JsonObject): string {
  const relationships = arr(data, 'relationships').filter(
    (relationship) =>
      text(relationship, 'from') === itemId(entity) ||
      text(relationship, 'to') === itemId(entity),
  )
  return [
    `# Entity: ${text(entity, 'name')}`,
    '',
    text(entity, 'description'),
    '',
    `Kind: ${text(entity, 'kind')}`,
    `Exposure: ${exposureLabel(data, itemId(entity))}`,
    '',
    '## Fields',
    ...arr(entity, 'fields').map((field) => `- ${text(field, 'name')}: ${text(field, 'type')}`),
    '',
    '## Relationships',
    ...relationships.map((relationship) => `- ${text(relationship, 'from')} -> ${text(relationship, 'to')}`),
  ].join('\n')
}

function buildFileMapPrompt(data: JsonObject, feature: JsonObject): string {
  const surfaces = linkedItems(data, 'surfaces', strArray(feature, 'surfaceIds'))
    .map((surface) => `${text(surface, 'name')} (${entryRoute(surface)})`)
    .join(', ')
  const implementations = arr(feature, 'implementations')
    .map((implementation) => text(implementation, 'file'))
    .filter(Boolean)
    .join(', ')

  return `Map every file that participates in the "${text(feature, 'name')}" feature and update cartograph.json.

Feature ID: ${itemId(feature)}
Kind: ${text(feature, 'kind')}
Description: ${text(feature, 'description')}
Surfaces: ${surfaces || 'none'}
Known implementation files: ${implementations || 'none'}

Update this feature's "files" array with objects containing "file" and "role".`
}

function buildFileTreeContext(data: JsonObject): string {
  return [
    '# Feature Map',
    '',
    ...arr(data, 'fileTree')
      .slice(0, 200)
      .map((file) => {
        const weights = arr(file, 'featureWeights')
          .map((weight) => `${featureName(data, text(weight, 'featureId'))} ${Math.round(num(weight, 'weight') * 100)}%`)
          .join(', ')
        return `- ${text(file, 'path') || text(file, 'file')}: ${weights}`
      }),
  ].join('\n')
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(item: unknown, key: string): JsonObject {
  if (!isRecord(item)) return {}
  const value = item[key]
  return isRecord(value) ? value : {}
}

function arr(item: unknown, key: string): JsonObject[] {
  if (!isRecord(item)) return []
  const value = item[key]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function strArray(item: JsonObject, key: string): string[] {
  const value = item[key]
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function text(item: unknown, key: string): string {
  if (!isRecord(item)) return ''
  const value = item[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function num(item: unknown, key: string): number {
  if (!isRecord(item)) return 0
  const value = item[key]
  return typeof value === 'number' ? value : 0
}

export default App
