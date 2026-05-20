import type { JsonObject, SwitchTab, TabId } from '../../types'
import { EmptyState } from '../common'
import { Overview } from '../../features/overview/Overview'
import {
  FeatureDetail,
  FeatureMapPanel,
  FlowDetail,
  InvariantsPanel,
  SurfaceDetail,
  TechStackPanel,
} from '../../features/product/ProductViews'
import { CodeHealthPanel, CompartmentPanel, EntityPanel } from '../../features/engineering/EngineeringViews'
import { arr, findById } from '../../lib/cartograph'

export function Panel({
  activeTab,
  data,
  selectedId,
  setSelectedId,
  switchTab,
}: {
  activeTab: TabId
  data: JsonObject
  selectedId: string | null
  setSelectedId: (id: string) => void
  switchTab: SwitchTab
}) {
  if (activeTab === 'overview') {
    return <Overview data={data} switchTab={switchTab} />
  }

  if (activeTab === 'surfaces') {
    const surfaces = arr(data, 'surfaces')
    const selected = findById(surfaces, selectedId) || surfaces[0]
    return selected ? (
      <SurfaceDetail data={data} surface={selected} switchTab={switchTab} />
    ) : (
      <EmptyState label="No surfaces found." />
    )
  }

  if (activeTab === 'features') {
    const features = arr(data, 'features')
    const selected = findById(features, selectedId) || features[0]
    return selected ? (
      <FeatureDetail data={data} feature={selected} switchTab={switchTab} />
    ) : (
      <EmptyState label="No features found." />
    )
  }

  if (activeTab === 'flows') {
    const flows = arr(data, 'flows')
    const selected = findById(flows, selectedId) || flows[0]
    return selected ? (
      <FlowDetail data={data} flow={selected} switchTab={switchTab} />
    ) : (
      <EmptyState label="No flows found." />
    )
  }

  if (activeTab === 'invariants') return <InvariantsPanel data={data} />
  if (activeTab === 'techstack') return <TechStackPanel data={data} />
  if (activeTab === 'featuremap') return <FeatureMapPanel data={data} selectedId={selectedId} />

  if (activeTab === 'datamodel') {
    const entities = arr(data, 'entities')
    const selected = findById(entities, selectedId) || entities[0]
    return selected ? (
      <EntityPanel data={data} entity={selected} setSelectedId={setSelectedId} />
    ) : (
      <EmptyState label="No entities found." />
    )
  }

  if (activeTab === 'codeorg') {
    const compartments = arr(data, 'compartments')
    const selected = findById(compartments, selectedId) || compartments[0]
    return selected ? (
      <CompartmentPanel compartment={selected} data={data} setSelectedId={setSelectedId} />
    ) : (
      <EmptyState label="No compartment data found." />
    )
  }

  return <CodeHealthPanel data={data} switchTab={switchTab} />
}
