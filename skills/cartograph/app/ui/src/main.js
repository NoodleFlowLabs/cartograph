import htm from 'htm'
import { h, render } from 'preact'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'

const html = htm.bind(h)

const tabs = [
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

const sidebarKeys = {
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
  const [loadState, setLoadState] = useState({ status: 'loading' })
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

  function switchTab(tabId, nextSelectedId) {
    setActiveTab(tabId)
    setSelectedId(nextSelectedId ?? null)
    setSearch('')
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
        <span>updated ${formatter.format(loadState.lastUpdated)}</span>
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

function Welcome({ dragging, loadState, onDragLeave, onDragOver, onDrop, onFile, onRefresh }) {
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

function Sidebar({ activeTab, data, search, selectedId, setSearch, setSelectedId }) {
  const key = sidebarKeys[activeTab]
  const items = key ? arr(data, key) : []
  const query = search.trim().toLowerCase()
  const indexedItems = items.map((item, index) => ({
    id: itemId(item, index),
    item,
  }))
  const filtered = indexedItems.filter(({ item }) =>
    searchableText(item).includes(query),
  )

  function handleSearchChange(value) {
    setSearch(value)
    const nextQuery = value.trim().toLowerCase()
    const nextItems = indexedItems.filter(({ item }) =>
      searchableText(item).includes(nextQuery),
    )

    if (
      nextItems.length &&
      (!selectedId || !nextItems.some(({ id }) => id === selectedId))
    ) {
      setSelectedId(nextItems[0].id)
    }
  }

  return html`<aside class="sidebar">
    <div class="sidebar-search">
      <input
        onInput=${(event) => handleSearchChange(event.currentTarget.value)}
        placeholder="Search..."
        value=${search}
      />
    </div>
    <div class="sidebar-list">
      ${filtered.map(
        ({ id, item }, index) => html`<button
          class=${`sidebar-item ${selectedId === id || (!selectedId && index === 0) ? 'active' : ''}`}
          key=${id}
          onClick=${() => setSelectedId(id)}
          type="button"
        >
          <span class="sidebar-label">${itemTitle(item, activeTab)}</span>
          <span class="sidebar-meta">${itemMeta(item, activeTab)}</span>
        </button>`,
      )}
      ${!filtered.length ? html`<${EmptyState} label="No matching items." compact=${true} />` : null}
    </div>
  </aside>`
}

function Panel({ activeTab, data, selectedId, setSelectedId, switchTab }) {
  if (activeTab === 'overview') return html`<${Overview} data=${data} switchTab=${switchTab} />`

  if (activeTab === 'surfaces') {
    const surfaces = arr(data, 'surfaces')
    const selected = findById(surfaces, selectedId) || surfaces[0]
    return selected
      ? html`<${SurfaceDetail} data=${data} surface=${selected} switchTab=${switchTab} />`
      : html`<${EmptyState} label="No surfaces found." />`
  }

  if (activeTab === 'features') {
    const features = arr(data, 'features')
    const selected = findById(features, selectedId) || features[0]
    return selected
      ? html`<${FeatureDetail} data=${data} feature=${selected} switchTab=${switchTab} />`
      : html`<${EmptyState} label="No features found." />`
  }

  if (activeTab === 'flows') {
    const flows = arr(data, 'flows')
    const selected = findById(flows, selectedId) || flows[0]
    return selected
      ? html`<${FlowDetail} data=${data} flow=${selected} switchTab=${switchTab} />`
      : html`<${EmptyState} label="No flows found." />`
  }

  if (activeTab === 'invariants') return html`<${InvariantsPanel} data=${data} />`
  if (activeTab === 'techstack') return html`<${TechStackPanel} data=${data} />`
  if (activeTab === 'featuremap') {
    return html`<${FeatureMapPanel} data=${data} selectedId=${selectedId} />`
  }

  if (activeTab === 'datamodel') {
    const entities = arr(data, 'entities')
    const selected = findById(entities, selectedId) || entities[0]
    return selected
      ? html`<${EntityPanel} data=${data} entity=${selected} setSelectedId=${setSelectedId} />`
      : html`<${EmptyState} label="No entities found." />`
  }

  if (activeTab === 'codeorg') {
    const compartments = arr(data, 'compartments')
    const selected = findById(compartments, selectedId) || compartments[0]
    return selected
      ? html`<${CompartmentPanel} compartment=${selected} data=${data} setSelectedId=${setSelectedId} />`
      : html`<${EmptyState} label="No compartment data found." />`
  }

  return html`<${CodeHealthPanel} data=${data} switchTab=${switchTab} />`
}

function Overview({ data, switchTab }) {
  const surfaces = arr(data, 'surfaces')
  const features = arr(data, 'features')
  const flows = arr(data, 'flows')
  const entities = arr(data, 'entities')
  const metrics = arr(record(data, 'codeHealth'), 'metrics')
  const techStack = arr(data, 'techStack')
  const invariants = getInvariants(data)

  return html`<div class="overview-stack">
    <section class="overview-stats-grid">
      <${MetricCard} label="Surfaces" value=${surfaces.length} />
      <${MetricCard} label="Features" value=${features.length} />
      <${MetricCard} label="Entities" value=${entities.length} />
      <${MetricCard} label="Flows" value=${flows.length} />
      <${MetricCard} label="Files" value=${trackedFileCount(data)} />
    </section>

    ${metrics.length
      ? html`<section class="overview-strip">
          <div>
            <div class="overview-section-title">Code health</div>
            <div class="health-row">
              ${metrics.map(
                (metric) => html`<button
                  class="health-pill"
                  key=${itemId(metric)}
                  onClick=${() => switchTab('codehealth')}
                  type="button"
                >
                  <span class=${`score-dot ${metricState(metric)}`}></span>
                  ${text(metric, 'name') || itemId(metric)} ${Math.round(num(metric, 'score'))}%
                </button>`,
              )}
            </div>
          </div>
        </section>`
      : null}

    ${invariants
      ? html`<section class="overview-strip">
          <div>
            <div class="overview-section-title">Invariants</div>
            <button class="health-pill" onClick=${() => switchTab('invariants')} type="button">
              <span class=${`score-dot ${num(invariants.summary, 'failing') > 0 ? 'red' : 'green'}`}></span>
              ${num(invariants.summary, 'passing')}/${num(invariants.summary, 'total')} passing
            </button>
          </div>
        </section>`
      : null}

    ${techStack.length
      ? html`<section class="overview-strip">
          <div>
            <div class="overview-section-title">Tech stack</div>
            <div class="chip-row">
              ${techStack.slice(0, 10).map(
                (item) => html`<button
                  class="detail-chip"
                  key=${itemId(item)}
                  onClick=${() => switchTab('techstack')}
                  type="button"
                >
                  ${text(item, 'name')}${text(item, 'version') ? ` ${text(item, 'version')}` : ''}
                </button>`,
              )}
            </div>
          </div>
        </section>`
      : null}

    <section>
      <div class="overview-section-title">Surfaces</div>
      <div class="overview-card-grid">
        ${surfaces.map(
          (surface, index) => html`<button
            class="overview-card"
            key=${itemId(surface, index)}
            onClick=${() => switchTab('surfaces', itemId(surface, index))}
            type="button"
          >
            <span class="card-title">${text(surface, 'name') || 'Unnamed surface'}</span>
            <span class="card-desc">${text(surface, 'description')}</span>
            <span class="card-meta">
              <${Badge}>${text(surface, 'actor') || 'surface'}<//>
              ${entryRoute(surface)}
            </span>
          </button>`,
        )}
      </div>
    </section>

    <section>
      <div class="overview-section-title">Feature breakdown</div>
      <div class="breakdown-list">
        ${groupBy(features, (feature) => text(feature, 'kind') || 'other').map(
          ([kind, items]) => html`<div class="breakdown-row" key=${kind}>
            <span>${kind} (${items.length})</span>
            <div class="inline-links">
              ${items.slice(0, 8).map(
                (feature, index) => html`<button
                  key=${itemId(feature, index)}
                  onClick=${() => switchTab('features', itemId(feature, index))}
                  type="button"
                >
                  ${text(feature, 'name')}
                </button>`,
              )}
            </div>
          </div>`,
        )}
      </div>
    </section>

    <section>
      <div class="overview-section-title">Key flows</div>
      <div class="overview-card-grid two">
        ${flows.slice(0, 8).map(
          (flow, index) => html`<button
            class="overview-card"
            key=${itemId(flow, index)}
            onClick=${() => switchTab('flows', itemId(flow, index))}
            type="button"
          >
            <span class="card-title">${text(flow, 'name') || 'Unnamed flow'}</span>
            <span class="card-desc">${text(flow, 'description')}</span>
            <span class="card-meta">
              <${Badge}>${text(flow, 'actor') || 'flow'}<//>
              ${arr(flow, 'steps').length} steps
            </span>
          </button>`,
        )}
      </div>
    </section>
  </div>`
}

function SurfaceDetail({ data, surface, switchTab }) {
  const features = arr(data, 'features').filter((feature) =>
    strArray(feature, 'surfaceIds').includes(itemId(surface)),
  )
  const entities = linkedItems(data, 'entities', strArray(surface, 'entityIds'))
  const operations = linkedItems(data, 'operations', strArray(surface, 'operationIds'))
  const flows = linkedItems(data, 'flows', strArray(surface, 'flowIds'))
  const compartments = linkedItems(data, 'compartments', strArray(surface, 'compartmentIds'))

  return html`<div class="detail-stack">
    <${DetailHeader}
      actions=${html`<${CopyButton} text=${buildSurfaceContext(data, surface)} />`}
      badges=${[text(surface, 'actor'), text(surface, 'confidence')]}
      description=${text(surface, 'description')}
      meta=${[entryRoute(surface), entryFile(surface)]}
      title=${text(surface, 'name') || 'Unnamed surface'}
    />
    <${LinkedSection} items=${features} label="Features" onClick=${(item) => switchTab('features', itemId(item))} />
    <${LinkedSection}
      items=${compartments}
      label="Compartments"
      onClick=${(item) => switchTab('codeorg', itemId(item))}
      subtitle=${(item) => `${arr(item, 'files').length} files`}
    />
    <${LinkedSection}
      items=${entities}
      label="Entities"
      onClick=${(item) => switchTab('datamodel', itemId(item))}
      subtitle=${(item) => text(item, 'kind')}
    />
    <${CardSection} label="Operations">
      ${operations.length
        ? operations.map(
            (operation) => html`<${InfoCard}
              badges=${[text(operation, 'type')]}
              description=${text(operation, 'description')}
              key=${itemId(operation)}
              meta=${implementationLabel(operation)}
              title=${text(operation, 'name')}
            />`,
          )
        : html`<${EmptyState} compact=${true} label="No operations." />`}
    <//>
    <${LinkedSection}
      items=${flows}
      label="Flows"
      onClick=${(item) => switchTab('flows', itemId(item))}
      subtitle=${(item) => `${arr(item, 'steps').length} steps`}
    />
  </div>`
}

function FeatureDetail({ data, feature, switchTab }) {
  const surfaces = linkedItems(data, 'surfaces', strArray(feature, 'surfaceIds'))
  const entities = linkedItems(data, 'entities', strArray(feature, 'entityIds'))
  const compartments = linkedItems(data, 'compartments', strArray(feature, 'compartmentIds'))
  const implementations = arr(feature, 'implementations')
  const files = arr(feature, 'files')

  return html`<div class="detail-stack">
    <${DetailHeader}
      actions=${html`<${CopyButton} text=${buildFeatureContext(data, feature)} />`}
      badges=${[text(feature, 'kind'), text(feature, 'confidence')]}
      description=${text(feature, 'description')}
      title=${text(feature, 'name') || 'Unnamed feature'}
    />
    <${LinkedSection}
      items=${surfaces}
      label="Embedded in surfaces"
      onClick=${(item) => switchTab('surfaces', itemId(item))}
      subtitle=${entryRoute}
    />
    <${LinkedSection}
      items=${entities}
      label="Entities"
      onClick=${(item) => switchTab('datamodel', itemId(item))}
      subtitle=${(item) => text(item, 'kind')}
    />
    <${LinkedSection}
      items=${compartments}
      label="Compartments"
      onClick=${(item) => switchTab('codeorg', itemId(item))}
      subtitle=${(item) => `${arr(item, 'files').length} files`}
    />
    <${CardSection} label="Key implementations">
      ${implementations.length
        ? implementations.map(
            (implementation, index) => html`<${InfoCard}
              description=${text(implementation, 'description')}
              key=${itemId(implementation, index)}
              meta=${text(implementation, 'file') || text(implementation, 'location')}
              title=${text(implementation, 'file') || `Implementation ${index + 1}`}
            />`,
          )
        : html`<${EmptyState} compact=${true} label="No implementation files." />`}
    <//>
    <${CardSection} label="File map">
      ${files.length
        ? files.map(
            (file, index) => html`<${InfoCard}
              badges=${[text(file, 'role') || 'file']}
              key=${itemId(file, index)}
              title=${text(file, 'file') || text(file, 'path')}
            />`,
          )
        : html`<${PromptBlock} text=${buildFileMapPrompt(data, feature)} />`}
    <//>
  </div>`
}

function FlowDetail({ data, flow, switchTab }) {
  return html`<div class="detail-stack">
    <${DetailHeader}
      actions=${html`<${CopyButton} text=${buildFlowContext(data, flow)} />`}
      badges=${[text(flow, 'actor'), text(flow, 'confidence')]}
      description=${text(flow, 'description')}
      meta=${[text(flow, 'trigger')]}
      title=${text(flow, 'name') || 'Unnamed flow'}
    />
    <ol class="step-list">
      ${arr(flow, 'steps').map((step, index) => {
        const entity = findById(arr(data, 'entities'), text(step, 'entityId'))
        return html`<li key=${itemId(step, index)}>
          <div class="step-num">${num(step, 'order') || index + 1}</div>
          <div>
            <div class="step-title">${text(step, 'description')}</div>
            <div class="impl-path">${implementationLabel(step)}</div>
            ${entity
              ? html`<button
                  class="inline-action"
                  onClick=${() => switchTab('datamodel', itemId(entity))}
                  type="button"
                >
                  ${text(entity, 'name')}
                </button>`
              : null}
          </div>
        </li>`
      })}
    </ol>
  </div>`
}

function InvariantsPanel({ data }) {
  const invariants = getInvariants(data)
  if (!invariants || !invariants.results.length) {
    return html`<${EmptyState} label="No invariants defined." />`
  }

  return html`<div class="detail-stack">
    <div class="summary-bar">
      <span>${num(invariants.summary, 'total')} invariants</span>
      <span class="green">${num(invariants.summary, 'passing')} passing</span>
      <span class="red">${num(invariants.summary, 'failing')} failing</span>
      <span>${num(invariants.summary, 'skipped')} skipped</span>
    </div>
    ${invariants.results.map(
      (result) => html`<details class="invariant-card" key=${itemId(result)}>
        <summary>
          <span class=${`status-dot ${text(result, 'status')}`}></span>
          <strong>${text(result, 'name') || text(result, 'id')}</strong>
          <${Badge}>${text(result, 'severity') || 'invariant'}<//>
        </summary>
        <p>${text(result, 'summary') || text(result, 'assertion')}</p>
        <div class="chip-row">
          ${strArray(result, 'tags').map((tag) => html`<${Badge} key=${tag}>${tag}<//>`)}
        </div>
        ${text(result, 'verificationPrompt') || text(result, 'fixPrompt')
          ? html`<${PromptBlock} text=${text(result, 'fixPrompt') || text(result, 'verificationPrompt')} />`
          : null}
      </details>`,
    )}
  </div>`
}

function TechStackPanel({ data }) {
  const items = arr(data, 'techStack')
  if (!items.length) return html`<${EmptyState} label="No tech stack data." />`

  return html`<div class="techstack-stack">
    ${groupBy(items, (item) => text(item, 'category') || 'other').map(
      ([category, group]) => html`<section key=${category}>
        <div class="overview-section-title">${category}</div>
        <div class="tech-grid">
          ${group.map(
            (item, index) => html`<${InfoCard}
              badges=${[text(item, 'confidence')]}
              description=${text(item, 'description')}
              key=${itemId(item, index)}
              meta=${text(item, 'source')}
              title=${`${text(item, 'name')}${text(item, 'version') ? ` ${text(item, 'version')}` : ''}`}
            />`,
          )}
        </div>
      </section>`,
    )}
  </div>`
}

function FeatureMapPanel({ data, selectedId }) {
  const fileTree = arr(data, 'fileTree')
  if (!fileTree.length) {
    return html`<${EmptyState} label="No file tree data. Re-run cartograph to generate." />`
  }

  const selected = findById(fileTree, selectedId) || fileTree[0]
  const weights = arr(selected, 'featureWeights')

  return html`<div class="detail-stack">
    <${DetailHeader}
      description="The file map shows which features own or influence each file."
      title=${text(selected, 'path') || text(selected, 'file') || 'Feature map'}
    />
    <${CardSection} label="Feature composition">
      ${weights.length
        ? weights.map(
            (weight, index) => html`<${InfoCard}
              badges=${[`${Math.round(num(weight, 'weight') * 100)}%`]}
              key=${itemId(weight, index)}
              title=${featureName(data, text(weight, 'featureId'))}
            />`,
          )
        : html`<${EmptyState} compact=${true} label="No feature weights for this file." />`}
    <//>
    <${PromptBlock} text=${buildFileTreeContext(data)} />
  </div>`
}

function EntityPanel({ data, entity, setSelectedId }) {
  const entities = arr(data, 'entities')
  const renderedEntities = entities.slice(0, 32)
  const relationships = arr(data, 'relationships').filter(
    (relationship) =>
      text(relationship, 'from') === itemId(entity) ||
      text(relationship, 'to') === itemId(entity),
  )

  return html`<div class="split-panel">
    <div class="graph-panel">
      ${renderedEntities.map(
        (item, index) => html`<button
          class=${`entity-node ${itemId(item) === itemId(entity) ? 'active' : ''}`}
          key=${itemId(item, index)}
          onClick=${() => setSelectedId(itemId(item, index))}
          style=${nodeStyle(index, renderedEntities.length)}
          type="button"
        >
          <span>${text(item, 'name')}</span>
          <small>${text(item, 'kind')}</small>
        </button>`,
      )}
    </div>
    <div class="detail-stack side-detail">
      <${DetailHeader}
        actions=${html`<${CopyButton} text=${buildEntityContext(data, entity)} />`}
        badges=${[text(entity, 'kind'), exposureLabel(data, itemId(entity))]}
        description=${text(entity, 'description')}
        meta=${[sourceLabel(entity)]}
        title=${text(entity, 'name') || 'Unnamed entity'}
      />
      <${CardSection} label="Fields">
        ${arr(entity, 'fields').map(
          (field, index) => html`<${InfoCard}
            description=${text(field, 'description')}
            key=${itemId(field, index)}
            meta=${text(field, 'type')}
            title=${text(field, 'name')}
          />`,
        )}
      <//>
      <${CardSection} label="Relationships">
        ${relationships.map(
          (relationship, index) => html`<${InfoCard}
            badges=${[text(relationship, 'type')]}
            description=${text(relationship, 'description')}
            key=${itemId(relationship, index)}
            title=${`${text(relationship, 'from')} -> ${text(relationship, 'to')}`}
          />`,
        )}
      <//>
    </div>
  </div>`
}

function CompartmentPanel({ compartment, data, setSelectedId }) {
  const children = arr(data, 'compartments').filter(
    (item) => text(item, 'parentId') === itemId(compartment),
  )
  const files = arr(compartment, 'files')

  return html`<div class="detail-stack">
    <${DetailHeader}
      badges=${strArray(compartment, 'tags')}
      description=${text(compartment, 'description')}
      title=${text(compartment, 'name') || 'Unnamed compartment'}
    />
    <${LinkedSection}
      items=${children}
      label="Child compartments"
      onClick=${(item) => setSelectedId(itemId(item))}
      subtitle=${(item) => `${arr(item, 'files').length} files`}
    />
    <${CardSection} label=${`Files (${files.length})`}>
      ${files.map(
        (file, index) => html`<${InfoCard}
          badges=${[text(file, 'role') || 'file']}
          description=${text(file, 'description')}
          key=${itemId(file, index)}
          title=${text(file, 'file') || text(file, 'path')}
        />`,
      )}
    <//>
  </div>`
}

function CodeHealthPanel({ data, switchTab }) {
  const metrics = arr(record(data, 'codeHealth'), 'metrics')
  if (!metrics.length) return html`<${EmptyState} label="No code health data." />`

  return html`<div class="codehealth-layout">
    ${metrics.map(
      (metric) => html`<section class="health-card" key=${itemId(metric)}>
        <div class="health-card-header">
          <div>
            <h2>${text(metric, 'name')}</h2>
            <p>${text(metric, 'summary') || text(metric, 'description')}</p>
          </div>
          <span class=${`health-score ${metricState(metric)}`}>${Math.round(num(metric, 'score'))}%</span>
        </div>
        <div class="finding-list">
          ${arr(metric, 'findings').map(
            (finding, index) => html`<${InfoCard}
              actions=${html`<button
                class="inline-action"
                onClick=${() => switchTab('codeorg')}
                type="button"
              >
                View in code
              </button>`}
              badges=${[text(finding, 'severity'), text(finding, 'kind')]}
              description=${text(finding, 'reason') || text(finding, 'summary')}
              key=${itemId(finding, index)}
              meta=${text(finding, 'file') || text(finding, 'target')}
              title=${text(finding, 'title') || text(finding, 'target') || `Finding ${index + 1}`}
            />`,
          )}
          ${!arr(metric, 'findings').length
            ? html`<${EmptyState} compact=${true} label="No findings for this metric." />`
            : null}
        </div>
      </section>`,
    )}
  </div>`
}

function DetailHeader({ actions, badges, description, meta, title }) {
  return html`<header class="detail-header">
    <div>
      <h1>${title}</h1>
      <div class="detail-meta">
        ${(badges || []).filter(Boolean).map((badge) => html`<${Badge} key=${badge}>${badge}<//>`)}
        ${(meta || []).filter(Boolean).map(
          (item) => html`<span class="impl-path" key=${item}>${item}</span>`,
        )}
      </div>
      ${description ? html`<p>${description}</p>` : null}
    </div>
    ${actions ? html`<div>${actions}</div>` : null}
  </header>`
}

function LinkedSection({ items, label, onClick, subtitle }) {
  return html`<${CardSection} label=${`${label} (${items.length})`}>
    ${items.length
      ? items.map(
          (item) => html`<button
            class="linked-item"
            key=${itemId(item)}
            onClick=${() => onClick(item)}
            type="button"
          >
            <span>${text(item, 'name') || itemId(item)}</span>
            ${subtitle ? html`<small>${subtitle(item)}</small>` : null}
          </button>`,
        )
      : html`<${EmptyState} compact=${true} label=${`No ${label.toLowerCase()}.`} />`}
  <//>`
}

function CardSection({ children, label }) {
  return html`<section>
    <div class="section-title">${label}</div>
    <div class="card-list">${children}</div>
  </section>`
}

function InfoCard({ actions, badges, description, meta, title }) {
  return html`<div class="info-card">
    <div class="info-card-top">
      <strong>${title || 'Untitled'}</strong>
      <div class="chip-row">
        ${(badges || []).filter(Boolean).map((badge) => html`<${Badge} key=${badge}>${badge}<//>`)}
      </div>
    </div>
    ${description ? html`<p>${description}</p>` : null}
    ${meta ? html`<div class="impl-path">${meta}</div>` : null}
    ${actions}
  </div>`
}

function PromptBlock({ text: prompt }) {
  return html`<div class="prompt-block">
    <${CopyButton} text=${prompt} />
    <pre>${prompt}</pre>
  </div>`
}

function CopyButton({ text: value }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return html`<button class="copy-btn" onClick=${() => void copy()} type="button">
    ${copied ? 'Copied' : 'Copy'}
  </button>`
}

function EmptyState({ compact, label }) {
  return html`<div class=${`empty-state ${compact ? 'compact' : ''}`}>${label}</div>`
}

function MetricCard({ label, value }) {
  return html`<div class="overview-stat-card">
    <div class="overview-stat-value">${value}</div>
    <div class="overview-stat-label">${label}</div>
  </div>`
}

function PreviewStat({ label, value }) {
  return html`<div class="preview-stat">
    <div>${value}</div>
    <span>${label}</span>
  </div>`
}

function Stat({ label, value }) {
  return html`<span><span class="stat-val">${value}</span>${label}</span>`
}

function Badge({ children }) {
  if (!children) return null
  return html`<span class="detail-tag">${children}</span>`
}

function InvariantBadge({ data }) {
  if (!data) return null
  const invariants = getInvariants(data)
  if (!invariants) return null
  const failing = num(invariants.summary, 'failing')
  const total = num(invariants.summary, 'total')
  return html`<span class=${`tab-badge ${failing ? 'has-failures' : 'all-passing'}`}>
    ${failing ? `${failing}/${total}` : total}
  </span>`
}

function getVisibleTabs(data) {
  return tabs.filter((tab) => {
    if (tab.id !== 'invariants') return true
    return Boolean(data && isRecord(data.invariants))
  })
}

function normalizeData(data) {
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

function getInvariants(data) {
  if (!isRecord(data.invariants)) return null
  const invariants = data.invariants
  const results = arr(invariants, 'results')
  return { results, summary: record(invariants, 'summary') }
}

function trackedFileCount(data) {
  const fileTree = arr(data, 'fileTree')
  if (fileTree.length) return fileTree.length
  const files = new Set()
  arr(data, 'compartments').forEach((compartment) => {
    arr(compartment, 'files').forEach((file) => {
      const filePath = text(file, 'file') || text(file, 'path')
      if (filePath) files.add(filePath)
    })
  })
  return files.size
}

function linkedItems(data, key, ids) {
  return ids
    .map((id) => findById(arr(data, key), id))
    .filter((item) => Boolean(item))
}

function groupBy(items, getKey) {
  const grouped = new Map()
  items.forEach((item) => {
    const key = getKey(item)
    grouped.set(key, [...(grouped.get(key) || []), item])
  })
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))
}

function findById(items, id) {
  if (!id) return null
  return items.find((item, index) => itemId(item, index) === id) || null
}

function itemId(item, fallback = 0) {
  return text(item, 'id') || text(item, 'path') || text(item, 'file') || `${fallback}`
}

function itemTitle(item, activeTab) {
  if (activeTab === 'featuremap') return text(item, 'path') || text(item, 'file') || 'File'
  return text(item, 'name') || text(item, 'id') || 'Untitled'
}

function itemMeta(item, activeTab) {
  if (activeTab === 'surfaces') return entryRoute(item)
  if (activeTab === 'features') return text(item, 'kind')
  if (activeTab === 'flows') return `${arr(item, 'steps').length} steps`
  if (activeTab === 'datamodel') return text(item, 'kind')
  if (activeTab === 'codeorg') return `${arr(item, 'files').length} files`
  if (activeTab === 'featuremap') return `${arr(item, 'featureWeights').length} features`
  return ''
}

function searchableText(item) {
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

function featureName(data, id) {
  if (id === '__infrastructure__') return 'Infrastructure'
  const feature = findById(arr(data, 'features'), id)
  return feature ? text(feature, 'name') || id : id || 'Unknown feature'
}

function entryRoute(item) {
  return text(record(item, 'entrypoint'), 'route')
}

function entryFile(item) {
  return text(record(item, 'entrypoint'), 'file')
}

function implementationLabel(item) {
  const implementation = record(item, 'implementation')
  return [text(implementation, 'file'), text(implementation, 'function')]
    .filter(Boolean)
    .join(' -> ')
}

function sourceLabel(item) {
  const source = record(item, 'source')
  return [text(source, 'file'), text(source, 'line')].filter(Boolean).join(':')
}

function exposureLabel(data, entityId) {
  const count = arr(data, 'surfaces').filter((surface) =>
    strArray(surface, 'entityIds').includes(entityId),
  ).length
  if (count <= 1) return 'scoped'
  if (count === 2) return 'shared'
  return 'cross-cutting'
}

function metricState(metric) {
  const score = num(metric, 'score')
  const thresholds = record(metric, 'thresholds')
  const green = thresholdValue(thresholds, 'green', 90)
  const yellow = thresholdValue(thresholds, 'yellow', 70)
  if (score >= green) return 'green'
  if (score >= yellow) return 'yellow'
  return 'red'
}

function thresholdValue(item, key, fallback) {
  const value = item[key]
  return typeof value === 'number' ? value : fallback
}

function nodeStyle(index, total) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1)
  const radius = 38
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
  }
}

function buildSurfaceContext(data, surface) {
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

function buildFeatureContext(data, feature) {
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

function buildFlowContext(data, flow) {
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

function buildEntityContext(data, entity) {
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

function buildFileMapPrompt(data, feature) {
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

function buildFileTreeContext(data) {
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

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(item, key) {
  if (!isRecord(item)) return {}
  const value = item[key]
  return isRecord(value) ? value : {}
}

function arr(item, key) {
  if (!isRecord(item)) return []
  const value = item[key]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function strArray(item, key) {
  const value = item[key]
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function text(item, key) {
  if (!isRecord(item)) return ''
  const value = item[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function num(item, key) {
  if (!isRecord(item)) return 0
  const value = item[key]
  return typeof value === 'number' ? value : 0
}

render(html`<${App} />`, document.getElementById('root'))
