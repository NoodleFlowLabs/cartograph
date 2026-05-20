import type { JsonObject, TabId } from '../../types'
import { arr, sidebarKeys, itemId, itemMeta, itemTitle, searchableText } from '../../lib/cartograph'
import { EmptyState } from '../common'

export function Sidebar({
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
