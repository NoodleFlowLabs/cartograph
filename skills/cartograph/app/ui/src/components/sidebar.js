import { sidebarKeys } from '../config.js'
import { html } from '../lib/html.js'
import { arr, itemId, itemMeta, itemTitle, searchableText } from '../lib/data.js'
import { EmptyState } from './common.js'

const implicitFirstSelectionTabs = new Set(['featuremap', 'datamodel', 'codeorg'])

export function Sidebar({ activeTab, data, search, selectedId, setSearch, setSelectedId }) {
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
          class=${`sidebar-item ${
            selectedId === id || (!selectedId && implicitFirstSelectionTabs.has(activeTab) && index === 0)
              ? 'active'
              : ''
          }`}
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
