import type { CSSProperties } from 'react'
import type { JsonObject, TabConfig, TabId } from '../types'

export const tabs: TabConfig[] = [
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

export const sidebarKeys: Partial<Record<TabId, string>> = {
  surfaces: 'surfaces',
  features: 'features',
  flows: 'flows',
  featuremap: 'fileTree',
  datamodel: 'entities',
  codeorg: 'compartments',
}

export const formatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

export function getVisibleTabs(data: JsonObject | null): TabConfig[] {
  return tabs.filter((tab) => {
    if (tab.id !== 'invariants') return true
    return Boolean(data && isRecord(data.invariants))
  })
}

export function normalizeData(data: JsonObject): JsonObject {
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

export function getInvariants(data: JsonObject): { summary: JsonObject; results: JsonObject[] } | null {
  if (!isRecord(data.invariants)) return null
  const invariants = data.invariants
  const results = arr(invariants, 'results')
  return { results, summary: record(invariants, 'summary') }
}

export function trackedFileCount(data: JsonObject): number {
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

export function linkedItems(data: JsonObject, key: string, ids: string[]): JsonObject[] {
  return ids
    .map((id) => findById(arr(data, key), id))
    .filter((item): item is JsonObject => Boolean(item))
}

export function groupBy(
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

export function findById(items: JsonObject[], id: string | null | undefined): JsonObject | null {
  if (!id) return null
  return items.find((item, index) => itemId(item, index) === id) || null
}

export function itemId(item: JsonObject, fallback = 0): string {
  return text(item, 'id') || text(item, 'path') || text(item, 'file') || `${fallback}`
}

export function itemTitle(item: JsonObject, activeTab: TabId): string {
  if (activeTab === 'featuremap') return text(item, 'path') || text(item, 'file') || 'File'
  return text(item, 'name') || text(item, 'id') || 'Untitled'
}

export function itemMeta(item: JsonObject, activeTab: TabId): string {
  if (activeTab === 'surfaces') return entryRoute(item)
  if (activeTab === 'features') return text(item, 'kind')
  if (activeTab === 'flows') return `${arr(item, 'steps').length} steps`
  if (activeTab === 'datamodel') return text(item, 'kind')
  if (activeTab === 'codeorg') return `${arr(item, 'files').length} files`
  if (activeTab === 'featuremap') return `${arr(item, 'featureWeights').length} features`
  return ''
}

export function searchableText(item: JsonObject): string {
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

export function featureName(data: JsonObject, id: string): string {
  if (id === '__infrastructure__') return 'Infrastructure'
  const feature = findById(arr(data, 'features'), id)
  return feature ? text(feature, 'name') || id : id || 'Unknown feature'
}

export function entryRoute(item: JsonObject): string {
  return text(record(item, 'entrypoint'), 'route')
}

export function entryFile(item: JsonObject): string {
  return text(record(item, 'entrypoint'), 'file')
}

export function implementationLabel(item: JsonObject): string {
  const implementation = record(item, 'implementation')
  return [text(implementation, 'file'), text(implementation, 'function')]
    .filter(Boolean)
    .join(' -> ')
}

export function sourceLabel(item: JsonObject): string {
  const source = record(item, 'source')
  return [text(source, 'file'), text(source, 'line')].filter(Boolean).join(':')
}

export function exposureLabel(data: JsonObject, entityId: string): string {
  const count = arr(data, 'surfaces').filter((surface) =>
    strArray(surface, 'entityIds').includes(entityId),
  ).length
  if (count <= 1) return 'scoped'
  if (count === 2) return 'shared'
  return 'cross-cutting'
}

export function metricState(metric: JsonObject): 'green' | 'yellow' | 'red' {
  const score = num(metric, 'score')
  const thresholds = record(metric, 'thresholds')
  const green = thresholdValue(thresholds, 'green', 90)
  const yellow = thresholdValue(thresholds, 'yellow', 70)
  if (score >= green) return 'green'
  if (score >= yellow) return 'yellow'
  return 'red'
}

function thresholdValue(item: JsonObject, key: string, fallback: number): number {
  const value = item[key]
  return typeof value === 'number' ? value : fallback
}

export function nodeStyle(index: number, total: number): CSSProperties {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1)
  const radius = 38
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
  }
}

export function buildSurfaceContext(data: JsonObject, surface: JsonObject): string {
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

export function buildFeatureContext(data: JsonObject, feature: JsonObject): string {
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

export function buildFlowContext(data: JsonObject, flow: JsonObject): string {
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

export function buildEntityContext(data: JsonObject, entity: JsonObject): string {
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

export function buildFileMapPrompt(data: JsonObject, feature: JsonObject): string {
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

export function buildFileTreeContext(data: JsonObject): string {
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

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function record(item: unknown, key: string): JsonObject {
  if (!isRecord(item)) return {}
  const value = item[key]
  return isRecord(value) ? value : {}
}

export function arr(item: unknown, key: string): JsonObject[] {
  if (!isRecord(item)) return []
  const value = item[key]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

export function strArray(item: JsonObject, key: string): string[] {
  const value = item[key]
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export function text(item: unknown, key: string): string {
  if (!isRecord(item)) return ''
  const value = item[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

export function num(item: unknown, key: string): number {
  if (!isRecord(item)) return 0
  const value = item[key]
  return typeof value === 'number' ? value : 0
}
