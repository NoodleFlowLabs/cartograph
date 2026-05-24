import { html } from '../lib/html.js'
import { arr, findById } from '../lib/data.js'
import { EmptyState } from '../components/common.js'
import { FeatureDetail, FlowDetail, SurfaceDetail } from './details.js'
import { Overview } from './overview.js'
import { CodeHealthPanel, CompartmentPanel, EntityPanel, FeatureMapPanel, InvariantsPanel, TechStackPanel } from './engineering.js'

export function Panel({ activeTab, data, selectedId, setSelectedId, switchTab }) {
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
