import { html } from '../vendor/htm-preact-standalone.module.js'
import {
  Badge,
  CardSection,
  CopyButton,
  DetailHeader,
  EmptyState,
  InfoCard,
  LinkedSection,
  PromptBlock,
} from './common.js'
import {
  arr,
  buildFeatureContext,
  buildFileMapPrompt,
  buildFileTreeContext,
  buildFlowContext,
  buildSurfaceContext,
  entryFile,
  entryRoute,
  featureName,
  findById,
  getInvariants,
  groupBy,
  implementationLabel,
  itemId,
  linkedItems,
  num,
  strArray,
  text,
} from '../lib/cartograph.js'

export function SurfaceDetail({ data, surface, switchTab }) {
  const features = arr(data, 'features').filter((feature) =>
    strArray(feature, 'surfaceIds').includes(itemId(surface)),
  )
  const entities = linkedItems(data, 'entities', strArray(surface, 'entityIds'))
  const operations = linkedItems(data, 'operations', strArray(surface, 'operationIds'))
  const flows = linkedItems(data, 'flows', strArray(surface, 'flowIds'))
  const compartments = linkedItems(data, 'compartments', strArray(surface, 'compartmentIds'))

  return html`
    <div class="detail-stack">
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
        ${operations.map((operation) => html`
          <${InfoCard}
            badges=${[text(operation, 'type')]}
            description=${text(operation, 'description')}
            key=${itemId(operation)}
            meta=${implementationLabel(operation)}
            title=${text(operation, 'name')}
          />
        `)}
      <//>
      <${LinkedSection}
        items=${flows}
        label="Flows"
        onClick=${(item) => switchTab('flows', itemId(item))}
        subtitle=${(item) => `${arr(item, 'steps').length} steps`}
      />
    </div>
  `
}

export function FeatureDetail({ data, feature, switchTab }) {
  const surfaces = linkedItems(data, 'surfaces', strArray(feature, 'surfaceIds'))
  const entities = linkedItems(data, 'entities', strArray(feature, 'entityIds'))
  const compartments = linkedItems(data, 'compartments', strArray(feature, 'compartmentIds'))
  const implementations = arr(feature, 'implementations')
  const files = arr(feature, 'files')

  return html`
    <div class="detail-stack">
      <${DetailHeader}
        actions=${html`<${CopyButton} text=${buildFeatureContext(data, feature)} />`}
        badges=${[text(feature, 'kind'), text(feature, 'confidence')]}
        description=${text(feature, 'description')}
        title=${text(feature, 'name') || 'Unnamed feature'}
      />
      <${LinkedSection} items=${surfaces} label="Embedded in surfaces" onClick=${(item) => switchTab('surfaces', itemId(item))} subtitle=${entryRoute} />
      <${LinkedSection} items=${entities} label="Entities" onClick=${(item) => switchTab('datamodel', itemId(item))} subtitle=${(item) => text(item, 'kind')} />
      <${LinkedSection} items=${compartments} label="Compartments" onClick=${(item) => switchTab('codeorg', itemId(item))} subtitle=${(item) => `${arr(item, 'files').length} files`} />
      <${CardSection} label="Key implementations">
        ${implementations.map((implementation, index) => html`
          <${InfoCard}
            description=${text(implementation, 'description')}
            key=${itemId(implementation, index)}
            meta=${text(implementation, 'file') || text(implementation, 'location')}
            title=${text(implementation, 'file') || `Implementation ${index + 1}`}
          />
        `)}
      <//>
      <${CardSection} label="File map">
        ${files.length
          ? files.map((file, index) => html`
              <${InfoCard} badges=${[text(file, 'role') || 'file']} key=${itemId(file, index)} title=${text(file, 'file') || text(file, 'path')} />
            `)
          : html`<${PromptBlock} text=${buildFileMapPrompt(data, feature)} />`}
      <//>
    </div>
  `
}

export function FlowDetail({ data, flow, switchTab }) {
  return html`
    <div class="detail-stack">
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
          return html`
            <li key=${itemId(step, index)}>
              <div class="step-num">${num(step, 'order') || index + 1}</div>
              <div>
                <div class="step-title">${text(step, 'description')}</div>
                <div class="impl-path">${implementationLabel(step)}</div>
                ${entity
                  ? html`<button class="inline-action" onClick=${() => switchTab('datamodel', itemId(entity))} type="button">${text(entity, 'name')}</button>`
                  : null}
              </div>
            </li>
          `
        })}
      </ol>
    </div>
  `
}

export function InvariantsPanel({ data }) {
  const invariants = getInvariants(data)
  if (!invariants || !invariants.results.length) {
    return html`<${EmptyState} label="No invariants defined." />`
  }

  return html`
    <div class="detail-stack">
      <div class="summary-bar">
        <span>${num(invariants.summary, 'total')} invariants</span>
        <span class="green">${num(invariants.summary, 'passing')} passing</span>
        <span class="red">${num(invariants.summary, 'failing')} failing</span>
        <span>${num(invariants.summary, 'skipped')} skipped</span>
      </div>
      ${invariants.results.map((result) => html`
        <details class="invariant-card" key=${itemId(result)}>
          <summary>
            <span class=${`status-dot ${text(result, 'status')}`}></span>
            <strong>${text(result, 'name') || text(result, 'id')}</strong>
            <${Badge}>${text(result, 'severity') || 'invariant'}<//>
          </summary>
          <p>${text(result, 'summary') || text(result, 'assertion')}</p>
          <div class="chip-row">
            ${strArray(result, 'tags').map((tag) => html`<${Badge} key=${tag}>${tag}<//>`)}
          </div>
          ${text(result, 'verificationPrompt') || text(result, 'fixPrompt')
            ? html`<${PromptBlock} text=${text(result, 'fixPrompt') || text(result, 'verificationPrompt')} />`
            : null}
        </details>
      `)}
    </div>
  `
}

export function TechStackPanel({ data }) {
  const items = arr(data, 'techStack')
  if (!items.length) return html`<${EmptyState} label="No tech stack data." />`

  return html`
    <div class="techstack-stack">
      ${groupBy(items, (item) => text(item, 'category') || 'other').map(([category, group]) => html`
        <section key=${category}>
          <div class="overview-section-title">${category}</div>
          <div class="tech-grid">
            ${group.map((item, index) => html`
              <${InfoCard}
                badges=${[text(item, 'confidence')]}
                description=${text(item, 'description')}
                key=${itemId(item, index)}
                meta=${text(item, 'source')}
                title=${`${text(item, 'name')}${text(item, 'version') ? ` ${text(item, 'version')}` : ''}`}
              />
            `)}
          </div>
        </section>
      `)}
    </div>
  `
}

export function FeatureMapPanel({ data, selectedId }) {
  const fileTree = arr(data, 'fileTree')
  if (!fileTree.length) {
    return html`<${EmptyState} label="No file tree data. Re-run cartograph to generate." />`
  }

  const selected = findById(fileTree, selectedId) || fileTree[0]
  const weights = arr(selected, 'featureWeights')

  return html`
    <div class="detail-stack">
      <${DetailHeader}
        description="The file map shows which features own or influence each file."
        title=${text(selected, 'path') || text(selected, 'file') || 'Feature map'}
      />
      <${CardSection} label="Feature composition">
        ${weights.length
          ? weights.map((weight, index) => html`
              <${InfoCard} badges=${[`${Math.round(num(weight, 'weight') * 100)}%`]} key=${itemId(weight, index)} title=${featureName(data, text(weight, 'featureId'))} />
            `)
          : html`<${EmptyState} compact=${true} label="No feature weights for this file." />`}
      <//>
      <${PromptBlock} text=${buildFileTreeContext(data)} />
    </div>
  `
}
