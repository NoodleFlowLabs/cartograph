export type JsonObject = Record<string, unknown>

export type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: JsonObject; lastUpdated: Date; source: string }
  | { status: 'missing'; message: string }
  | { status: 'error'; message: string }

export type TabId =
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

export type TabConfig = {
  id: TabId
  label: string
  group: 'overview' | 'pm' | 'eng'
  sidebar: boolean
}

export type SwitchTab = (tab: TabId, selectedId?: string) => void
