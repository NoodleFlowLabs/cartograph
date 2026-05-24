export const tabs = [
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

export const sidebarKeys = {
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
