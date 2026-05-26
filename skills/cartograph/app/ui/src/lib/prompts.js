import { arr, entryFile, entryRoute, exposureLabel, featureName, findById, itemId, linkedItems, num, strArray, text } from './data.js'

export function buildSurfaceContext(data, surface) {
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

export function buildFeatureContext(data, feature) {
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

export function buildFlowContext(data, flow) {
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

export function buildEntityContext(data, entity) {
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

export function buildFileMapPrompt(data, feature) {
  const surfaces = linkedItems(data, 'surfaces', strArray(feature, 'surfaceIds'))
    .map((surface) => `${text(surface, 'name')} (${entryRoute(surface)})`)
    .join(', ')
  const implementations = arr(feature, 'implementations')
    .map((implementation) => text(implementation, 'file'))
    .filter(Boolean)
    .join(', ')

  return `Map every file that participates in the "${text(feature, 'name')}" feature and update .cartograph/mapping.json.

Feature ID: ${itemId(feature)}
Kind: ${text(feature, 'kind')}
Description: ${text(feature, 'description')}
Surfaces: ${surfaces || 'none'}
Known implementation files: ${implementations || 'none'}

Update this feature's "files" array with objects containing "file" and "role".`
}

export function buildFileTreeContext(data) {
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
