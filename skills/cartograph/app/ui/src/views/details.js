import { html } from '../lib/html.js'
import { arr, entryFile, entryRoute, findById, implementationLabel, itemId, linkedItems, num, strArray, text } from '../lib/data.js'
import { buildFeatureContext, buildFileMapPrompt, buildFlowContext, buildSurfaceContext } from '../lib/prompts.js'
import { CardSection, CopyButton, DetailHeader, EmptyState, InfoCard, LinkedSection, PromptBlock } from '../components/common.js'

export function SurfaceDetail({ data, surface, switchTab }) {
  const features = arr(data, 'features').filter((feature) =>
    strArray(feature, 'surfaceIds').includes(itemId(surface)),
  )
  const entities = linkedItems(data, 'entities', strArray(surface, 'entityIds'))
  const operations = linkedItems(data, 'operations', strArray(surface, 'operationIds'))
  const flows = linkedItems(data, 'flows', strArray(surface, 'flowIds'))
  const compartments = linkedItems(data, 'compartments', strArray(surface, 'compartmentIds'))

  return html`<div class="detail-stack">
    <${DetailHeader}
      actions=${html`<${CopyButton} text=${buildSurfaceContext(data, surface)} />`}
      badges=${[text(surface, 'actor'), text(surface, 'confidence')]}
      description=${text(surface, 'description')}
      meta=${[entryRoute(surface), entryFile(surface)]}
      title=${text(surface, 'name') || 'Unnamed surface'}
    />
    <${LinkedSection} items=${features} label="Features" onClick=${(item) => switchTab('features', itemId(item))} />
    <${LinkedSection}
      items=${compartments}
      label="Compartments"
      onClick=${(item) => switchTab('codeorg', itemId(item))}
      subtitle=${(item) => `${arr(item, 'files').length} files`}
    />
    <${LinkedSection}
      items=${entities}
      label="Entities"
      onClick=${(item) => switchTab('datamodel', itemId(item))}
      subtitle=${(item) => text(item, 'kind')}
    />
    <${CardSection} label="Operations">
      ${operations.length
        ? operations.map(
            (operation) => html`<${InfoCard}
              badges=${[text(operation, 'type')]}
              description=${text(operation, 'description')}
              key=${itemId(operation)}
              meta=${implementationLabel(operation)}
              title=${text(operation, 'name')}
            />`,
          )
        : html`<${EmptyState} compact=${true} label="No operations." />`}
    <//>
    <${LinkedSection}
      items=${flows}
      label="Flows"
      onClick=${(item) => switchTab('flows', itemId(item))}
      subtitle=${(item) => `${arr(item, 'steps').length} steps`}
    />
  </div>`
}

export function FeatureDetail({ data, feature, switchTab }) {
  const surfaces = linkedItems(data, 'surfaces', strArray(feature, 'surfaceIds'))
  const entities = linkedItems(data, 'entities', strArray(feature, 'entityIds'))
  const compartments = linkedItems(data, 'compartments', strArray(feature, 'compartmentIds'))
  const implementations = arr(feature, 'implementations')
  const files = arr(feature, 'files')

  return html`<div class="detail-stack">
    <${DetailHeader}
      actions=${html`<${CopyButton} text=${buildFeatureContext(data, feature)} />`}
      badges=${[text(feature, 'kind'), text(feature, 'confidence')]}
      description=${text(feature, 'description')}
      title=${text(feature, 'name') || 'Unnamed feature'}
    />
    <${LinkedSection}
      items=${surfaces}
      label="Embedded in surfaces"
      onClick=${(item) => switchTab('surfaces', itemId(item))}
      subtitle=${entryRoute}
    />
    <${LinkedSection}
      items=${entities}
      label="Entities"
      onClick=${(item) => switchTab('datamodel', itemId(item))}
      subtitle=${(item) => text(item, 'kind')}
    />
    <${LinkedSection}
      items=${compartments}
      label="Compartments"
      onClick=${(item) => switchTab('codeorg', itemId(item))}
      subtitle=${(item) => `${arr(item, 'files').length} files`}
    />
    <${CardSection} label="Key implementations">
      ${implementations.length
        ? implementations.map(
            (implementation, index) => html`<${InfoCard}
              description=${text(implementation, 'description')}
              key=${itemId(implementation, index)}
              meta=${text(implementation, 'file') || text(implementation, 'location')}
              title=${text(implementation, 'file') || `Implementation ${index + 1}`}
            />`,
          )
        : html`<${EmptyState} compact=${true} label="No implementation files." />`}
    <//>
    <${CardSection} label="File map">
      ${files.length
        ? files.map(
            (file, index) => html`<${InfoCard}
              badges=${[text(file, 'role') || 'file']}
              key=${itemId(file, index)}
              title=${text(file, 'file') || text(file, 'path')}
            />`,
          )
        : html`<${PromptBlock} text=${buildFileMapPrompt(data, feature)} />`}
    <//>
  </div>`
}

export function FlowDetail({ data, flow, switchTab }) {
  return html`<div class="detail-stack">
    <${DetailHeader}
      actions=${html`<${CopyButton} text=${buildFlowContext(data, flow)} />`}
      badges=${[text(flow, 'actor'), text(flow, 'confidence')]}
      description=${text(flow, 'description')}
      meta=${[text(flow, 'trigger')]}
      title=${text(flow, 'name') || 'Unnamed flow'}
    />
    <ol class="step-list">
      ${arr(flow, 'steps').map((step, index) => {
        const entity = findById(arr(data, 'entities'), text(step, 'entityId'))
        return html`<li key=${itemId(step, index)}>
          <div class="step-num">${num(step, 'order') || index + 1}</div>
          <div>
            <div class="step-title">${text(step, 'description')}</div>
            <div class="impl-path">${implementationLabel(step)}</div>
            ${entity
              ? html`<button
                  class="inline-action"
                  onClick=${() => switchTab('datamodel', itemId(entity))}
                  type="button"
                >
                  ${text(entity, 'name')}
                </button>`
              : null}
          </div>
        </li>`
      })}
    </ol>
  </div>`
}
