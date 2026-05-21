import { html } from '../vendor/htm-preact-standalone.module.js'
import { EmptyState } from './common.js'
import { Overview } from './overview.js'
import {
  FeatureDetail,
  FeatureMapPanel,
  FlowDetail,
  InvariantsPanel,
  SurfaceDetail,
  TechStackPanel,
} from './product.js'
import { CodeHealthPanel, CompartmentPanel, EntityPanel } from './engineering.js'
import {
  arr,
  findById,
  itemId,
  itemMeta,
  itemTitle,
  searchableText,
  sidebarKeys,
} from '../lib/cartograph.js'

export function Sidebar({ activeTab, data, search, selectedId, setSearch, setSelectedId }) {
  const key = sidebarKeys[activeTab]
  const items = key ? arr(data, key) : []
  const query = search.trim().toLowerCase()
  const indexedItems = items.map((item, index) => ({ id: itemId(item, index), item }))
  const filtered = indexedItems.filter(({ item }) => searchableText(item).includes(query))

  function handleSearchChange(value) {
    setSearch(value)
    const nextQuery = value.trim().toLowerCase()
    const nextItems = indexedItems.filter(({ item }) => searchableText(item).includes(nextQuery))

    if (nextItems.length && (!selectedId || !nextItems.some(({ id }) => id === selectedId))) {
      setSelectedId(nextItems[0].id)
    }
  }

  return html`
    <aside className="sidebar">
      <div className="sidebar-search">
        <input
          onInput=${(event) => handleSearchChange(event.currentTarget.value)}
          placeholder="Search..."
          value=${search}
        />
      </div>
      <div className="sidebar-list">
        ${filtered.map(({ id, item }, index) => html`
          <button
            className=${`sidebar-item ${selectedId === id || (!selectedId && index === 0) ? 'active' : ''}`}
            key=${id}
            onClick=${() => setSelectedId(id)}
            type="button"
          >
            <span className="sidebar-label">${itemTitle(item, activeTab)}</span>
            <span className="sidebar-meta">${itemMeta(item, activeTab)}</span>
          </button>
        `)}
        ${!filtered.length ? html`<${EmptyState} label="No matching items." compact=${true} />` : null}
      </div>
    </aside>
  `
}

export function Panel({ activeTab, data, selectedId, setSelectedId, switchTab }) {
  if (activeTab === 'overview') {
    return html`<${Overview} data=${data} switchTab=${switchTab} />`
  }

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
  if (activeTab === 'featuremap') return html`<${FeatureMapPanel} data=${data} selectedId=${selectedId} />`

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
