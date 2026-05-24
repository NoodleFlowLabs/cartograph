import { tabs } from '../config.js'

export function getVisibleTabs(data) {
  return tabs.filter((tab) => {
    if (tab.id !== 'invariants') return true
    return Boolean(data && isRecord(data.invariants))
  })
}

export function normalizeData(data) {
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

export function getInvariants(data) {
  if (!isRecord(data.invariants)) return null
  const invariants = data.invariants
  const results = arr(invariants, 'results')
  return { results, summary: record(invariants, 'summary') }
}

export function trackedFileCount(data) {
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

export function linkedItems(data, key, ids) {
  return ids
    .map((id) => findById(arr(data, key), id))
    .filter((item) => Boolean(item))
}

export function groupBy(items, getKey) {
  const grouped = new Map()
  items.forEach((item) => {
    const key = getKey(item)
    grouped.set(key, [...(grouped.get(key) || []), item])
  })
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))
}

export function findById(items, id) {
  if (!id) return null
  return items.find((item, index) => itemId(item, index) === id) || null
}

export function itemId(item, fallback = 0) {
  return text(item, 'id') || text(item, 'path') || text(item, 'file') || `${fallback}`
}

export function itemTitle(item, activeTab) {
  if (activeTab === 'featuremap') return text(item, 'path') || text(item, 'file') || 'File'
  return text(item, 'name') || text(item, 'id') || 'Untitled'
}

export function itemMeta(item, activeTab) {
  if (activeTab === 'surfaces') return entryRoute(item)
  if (activeTab === 'features') return text(item, 'kind')
  if (activeTab === 'flows') return `${arr(item, 'steps').length} steps`
  if (activeTab === 'datamodel') return text(item, 'kind')
  if (activeTab === 'codeorg') return `${arr(item, 'files').length} files`
  if (activeTab === 'featuremap') return `${arr(item, 'featureWeights').length} features`
  return ''
}

export function searchableText(item) {
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

export function featureName(data, id) {
  if (id === '__infrastructure__') return 'Infrastructure'
  const feature = findById(arr(data, 'features'), id)
  return feature ? text(feature, 'name') || id : id || 'Unknown feature'
}

export function entryRoute(item) {
  return text(record(item, 'entrypoint'), 'route')
}

export function entryFile(item) {
  return text(record(item, 'entrypoint'), 'file')
}

export function implementationLabel(item) {
  const implementation = record(item, 'implementation')
  return [text(implementation, 'file'), text(implementation, 'function')]
    .filter(Boolean)
    .join(' -> ')
}

export function sourceLabel(item) {
  const source = record(item, 'source')
  return [text(source, 'file'), text(source, 'line')].filter(Boolean).join(':')
}

export function exposureLabel(data, entityId) {
  const count = arr(data, 'surfaces').filter((surface) =>
    strArray(surface, 'entityIds').includes(entityId),
  ).length
  if (count <= 1) return 'scoped'
  if (count === 2) return 'shared'
  return 'cross-cutting'
}

export function metricState(metric) {
  const score = num(metric, 'score')
  const thresholds = record(metric, 'thresholds')
  const green = thresholdValue(thresholds, 'green', 90)
  const yellow = thresholdValue(thresholds, 'yellow', 70)
  if (score >= green) return 'green'
  if (score >= yellow) return 'yellow'
  return 'red'
}

export function thresholdValue(item, key, fallback) {
  const value = item[key]
  return typeof value === 'number' ? value : fallback
}

export function nodeStyle(index, total) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1)
  const radius = 38
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
  }
}

export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function record(item, key) {
  if (!isRecord(item)) return {}
  const value = item[key]
  return isRecord(value) ? value : {}
}

export function arr(item, key) {
  if (!isRecord(item)) return []
  const value = item[key]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

export function strArray(item, key) {
  const value = item[key]
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export function text(item, key) {
  if (!isRecord(item)) return ''
  const value = item[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

export function num(item, key) {
  if (!isRecord(item)) return 0
  const value = item[key]
  return typeof value === 'number' ? value : 0
}
