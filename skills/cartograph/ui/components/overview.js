import { html } from '../vendor/htm-preact-standalone.module.js'
import { Badge, MetricCard } from './common.js'
import {
  arr,
  entryRoute,
  getInvariants,
  groupBy,
  itemId,
  metricState,
  num,
  record,
  text,
  trackedFileCount,
} from '../lib/cartograph.js'

export function Overview({ data, switchTab }) {
  const surfaces = arr(data, 'surfaces')
  const features = arr(data, 'features')
  const flows = arr(data, 'flows')
  const entities = arr(data, 'entities')
  const metrics = arr(record(data, 'codeHealth'), 'metrics')
  const techStack = arr(data, 'techStack')
  const invariants = getInvariants(data)

  return html`
    <div class="overview-stack">
      <section class="overview-stats-grid">
        <${MetricCard} label="Surfaces" value=${surfaces.length} />
        <${MetricCard} label="Features" value=${features.length} />
        <${MetricCard} label="Entities" value=${entities.length} />
        <${MetricCard} label="Flows" value=${flows.length} />
        <${MetricCard} label="Files" value=${trackedFileCount(data)} />
      </section>

      ${metrics.length
        ? html`
            <section class="overview-strip">
              <div>
                <div class="overview-section-title">Code health</div>
                <div class="health-row">
                  ${metrics.map((metric) => html`
                    <button class="health-pill" key=${itemId(metric)} onClick=${() => switchTab('codehealth')} type="button">
                      <span class=${`score-dot ${metricState(metric)}`}></span>
                      ${text(metric, 'name') || itemId(metric)} ${Math.round(num(metric, 'score'))}%
                    </button>
                  `)}
                </div>
              </div>
            </section>
          `
        : null}

      ${invariants
        ? html`
            <section class="overview-strip">
              <div>
                <div class="overview-section-title">Invariants</div>
                <button class="health-pill" onClick=${() => switchTab('invariants')} type="button">
                  <span class=${`score-dot ${num(invariants.summary, 'failing') > 0 ? 'red' : 'green'}`}></span>
                  ${num(invariants.summary, 'passing')}/${num(invariants.summary, 'total')} passing
                </button>
              </div>
            </section>
          `
        : null}

      ${techStack.length
        ? html`
            <section class="overview-strip">
              <div>
                <div class="overview-section-title">Tech stack</div>
                <div class="chip-row">
                  ${techStack.slice(0, 10).map((item) => html`
                    <button class="detail-chip" key=${itemId(item)} onClick=${() => switchTab('techstack')} type="button">
                      ${text(item, 'name')}${text(item, 'version') ? ` ${text(item, 'version')}` : ''}
                    </button>
                  `)}
                </div>
              </div>
            </section>
          `
        : null}

      <section>
        <div class="overview-section-title">Surfaces</div>
        <div class="overview-card-grid">
          ${surfaces.map((surface, index) => html`
            <button class="overview-card" key=${itemId(surface, index)} onClick=${() => switchTab('surfaces', itemId(surface, index))} type="button">
              <span class="card-title">${text(surface, 'name') || 'Unnamed surface'}</span>
              <span class="card-desc">${text(surface, 'description')}</span>
              <span class="card-meta">
                <${Badge}>${text(surface, 'actor') || 'surface'}<//>
                ${entryRoute(surface)}
              </span>
            </button>
          `)}
        </div>
      </section>

      <section>
        <div class="overview-section-title">Feature breakdown</div>
        <div class="breakdown-list">
          ${groupBy(features, (feature) => text(feature, 'kind') || 'other').map(([kind, items]) => html`
            <div class="breakdown-row" key=${kind}>
              <span>${kind} (${items.length})</span>
              <div class="inline-links">
                ${items.slice(0, 8).map((feature, index) => html`
                  <button key=${itemId(feature, index)} onClick=${() => switchTab('features', itemId(feature, index))} type="button">
                    ${text(feature, 'name')}
                  </button>
                `)}
              </div>
            </div>
          `)}
        </div>
      </section>

      <section>
        <div class="overview-section-title">Key flows</div>
        <div class="overview-card-grid two">
          ${flows.slice(0, 8).map((flow, index) => html`
            <button class="overview-card" key=${itemId(flow, index)} onClick=${() => switchTab('flows', itemId(flow, index))} type="button">
              <span class="card-title">${text(flow, 'name') || 'Unnamed flow'}</span>
              <span class="card-desc">${text(flow, 'description')}</span>
              <span class="card-meta">
                <${Badge}>${text(flow, 'actor') || 'flow'}<//>
                ${arr(flow, 'steps').length} steps
              </span>
            </button>
          `)}
        </div>
      </section>
    </div>
  `
}
