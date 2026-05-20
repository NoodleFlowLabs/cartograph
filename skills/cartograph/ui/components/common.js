import { html, useState } from '../vendor/htm-preact-standalone.module.js'
import { getInvariants, itemId, num, text } from '../lib/cartograph.js'

export function DetailHeader({ actions, badges = [], description, meta = [], title }) {
  return html`
    <header class="detail-header">
      <div>
        <h1>${title}</h1>
        <div class="detail-meta">
          ${badges.filter(Boolean).map((badge) => html`<${Badge} key=${badge}>${badge}<//>`)}
          ${meta.filter(Boolean).map((item) => html`<span class="impl-path" key=${item}>${item}</span>`)}
        </div>
        ${description ? html`<p>${description}</p>` : null}
      </div>
      ${actions ? html`<div>${actions}</div>` : null}
    </header>
  `
}

export function LinkedSection({ items, label, onClick, subtitle }) {
  return html`
    <${CardSection} label=${`${label} (${items.length})`}>
      ${items.length
        ? items.map((item) => html`
            <button class="linked-item" key=${itemId(item)} onClick=${() => onClick(item)} type="button">
              <span>${text(item, 'name') || itemId(item)}</span>
              ${subtitle ? html`<small>${subtitle(item)}</small>` : null}
            </button>
          `)
        : html`<${EmptyState} compact=${true} label=${`No ${label.toLowerCase()}.`} />`}
    <//>
  `
}

export function CardSection({ children, label }) {
  return html`
    <section>
      <div class="section-title">${label}</div>
      <div class="card-list">${children}</div>
    </section>
  `
}

export function InfoCard({ actions, badges = [], description, meta, title }) {
  return html`
    <div class="info-card">
      <div class="info-card-top">
        <strong>${title || 'Untitled'}</strong>
        <div class="chip-row">
          ${badges.filter(Boolean).map((badge) => html`<${Badge} key=${badge}>${badge}<//>`)}
        </div>
      </div>
      ${description ? html`<p>${description}</p>` : null}
      ${meta ? html`<div class="impl-path">${meta}</div>` : null}
      ${actions}
    </div>
  `
}

export function PromptBlock({ text: prompt }) {
  return html`
    <div class="prompt-block">
      <${CopyButton} text=${prompt} />
      <pre>${prompt}</pre>
    </div>
  `
}

export function CopyButton({ text: value }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return html`
    <button class="copy-btn" onClick=${() => void copy()} type="button">
      ${copied ? 'Copied' : 'Copy'}
    </button>
  `
}

export function EmptyState({ compact, label }) {
  return html`<div class=${`empty-state ${compact ? 'compact' : ''}`}>${label}</div>`
}

export function MetricCard({ label, value }) {
  return html`
    <div class="overview-stat-card">
      <div class="overview-stat-value">${value}</div>
      <div class="overview-stat-label">${label}</div>
    </div>
  `
}

export function PreviewStat({ label, value }) {
  return html`
    <div class="preview-stat">
      <div>${value}</div>
      <span>${label}</span>
    </div>
  `
}

export function Stat({ label, value }) {
  return html`
    <span>
      <span class="stat-val">${value}</span>
      ${label}
    </span>
  `
}

export function Badge({ children }) {
  if (!children) return null
  return html`<span class="detail-tag">${children}</span>`
}

export function InvariantBadge({ data }) {
  if (!data) return null
  const invariants = getInvariants(data)
  if (!invariants) return null
  const failing = num(invariants.summary, 'failing')
  const total = num(invariants.summary, 'total')
  return html`
    <span class=${`tab-badge ${failing ? 'has-failures' : 'all-passing'}`}>
      ${failing ? `${failing}/${total}` : total}
    </span>
  `
}
