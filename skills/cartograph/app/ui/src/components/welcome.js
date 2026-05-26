import { useState } from 'preact/hooks'
import { html } from '../lib/html.js'

const previewTabs = [
  ['overview', 'Overview'],
  ['surfaces', 'Surfaces'],
  ['features', 'Features'],
  ['flows', 'Flows'],
  ['invariants', 'Invariants'],
  ['techstack', 'Tech Stack'],
  ['featuremap', 'Feature Map'],
  ['datamodel', 'Data Model'],
  ['codeorg', 'Code Org'],
  ['codehealth', 'Code Health'],
]

export function Welcome({ dragging, loadState, onDragLeave, onDragOver, onDrop, onFile, onRefresh }) {
  const [previewTab, setPreviewTab] = useState('overview')
  const message =
    loadState.status === 'loading'
      ? 'Connecting to the local Cartograph server.'
      : loadState.status === 'missing' || loadState.status === 'error'
        ? loadState.message
        : ''

  return html`<main class="welcome-shell">
    <div class="welcome-logo">
      <img src="/cartograph-logo.svg" width="28" height="28" alt="" />
      <span class="welcome-logo-text">Cartograph</span>
    </div>

    <section class="preview-dashboard">
      <div class="preview-mock-banner">
        Sample dashboard - upload your file below for real data
      </div>
      <div class="preview-tab-bar">
        <${PreviewTab}
          active=${previewTab === 'overview'}
          id="overview"
          label="Overview"
          setPreviewTab=${setPreviewTab}
        />
        <span class="preview-group-sep"></span>
        <span class="preview-group-label pm">PM</span>
        ${previewTabs.slice(1, 5).map(
          ([id, label]) => html`<${PreviewTab}
            active=${previewTab === id}
            id=${id}
            key=${id}
            label=${label}
            setPreviewTab=${setPreviewTab}
          />`,
        )}
        <span class="preview-group-sep"></span>
        <span class="preview-group-label eng">Eng</span>
        ${previewTabs.slice(5).map(
          ([id, label]) => html`<${PreviewTab}
            active=${previewTab === id}
            id=${id}
            key=${id}
            label=${label}
            setPreviewTab=${setPreviewTab}
          />`,
        )}
      </div>
      <div class="preview-content">
        <${PreviewPane} active=${previewTab === 'overview'}>
          <div class="pv-stats">
            <${PreviewStat} label="Surfaces" value="12" />
            <${PreviewStat} label="Features" value="47" />
            <${PreviewStat} label="Entities" value="28" />
            <${PreviewStat} label="Flows" value="8" />
          </div>
        <//>
        <${PreviewPane} active=${previewTab === 'surfaces'}>
          <${PreviewList} items=${['Home Feed', 'User Profile', 'Checkout', 'Notifications']} />
        <//>
        <${PreviewPane} active=${previewTab === 'features'}>
          <${PreviewList} items=${['User Authentication', 'Full-Text Search', 'Payment Processing']} />
        <//>
        <${PreviewPane} active=${previewTab === 'flows'}>
          <div class="pv-flow">
            ${['Signup', 'Verify', 'Onboard', 'Dashboard'].map(
              (step, index) => html`${index ? html`<span class="pv-arrow">-&gt;</span>` : null}
                <div class="pv-step" key=${step}>${step}</div>`,
            )}
          </div>
        <//>
        <${PreviewPane} active=${previewTab === 'invariants'}>
          <div class="pv-checks">
            <div class="pv-check pass">Credits refunded on failure</div>
            <div class="pv-check pass">Free trial always 14 days</div>
            <div class="pv-check fail">Deleted users lose access</div>
          </div>
        <//>
        <${PreviewPane} active=${previewTab === 'techstack'}>
          <div class="pv-pills">
            ${['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis'].map(
              (item) => html`<div class="pv-pill" key=${item}>${item}</div>`,
            )}
          </div>
        <//>
        <${PreviewPane} active=${previewTab === 'featuremap'}>
          <div class="pv-list wide">
            ${[
              ['src/feed/', 'Home Feed', 'tone-pm'],
              ['src/profile/', 'User Profile', 'tone-accent'],
              ['src/checkout/', 'Checkout', 'tone-green'],
              ['src/notifications/', 'Notifications', 'tone-purple'],
            ].map(
              ([path, feature, color]) => html`<div class="pv-row pv-row-split" key=${path}>
                <span class="pv-path">${path}</span>
                <span class=${`pv-tag ${color}`}>${feature}</span>
              </div>`,
            )}
          </div>
        <//>
        <${PreviewPane} active=${previewTab === 'datamodel'}>
          <div class="pv-model">
            <div class="pv-graph">
              <div class="pv-node tone-accent">User</div>
              <div class="pv-edge"></div>
              <div class="pv-node tone-pm">Order</div>
              <div class="pv-edge"></div>
              <div class="pv-node tone-green">Product</div>
            </div>
            <div class="pv-branch"></div>
            <div class="pv-graph">
              <div class="pv-node tone-purple">Session</div>
              <div class="pv-edge"></div>
              <div class="pv-node tone-orange">Payment</div>
              <div class="pv-edge"></div>
              <div class="pv-node tone-pink">Review</div>
            </div>
          </div>
        <//>
        <${PreviewPane} active=${previewTab === 'codeorg'}>
          <div class="pv-modules">
            <${PreviewModule} name="Checkout" tone="tone-pm" files=${['src/cart/', 'PaymentForm.tsx', 'receipt.ts']} />
            <${PreviewModule} name="User Profile" tone="tone-accent" files=${['src/profile/', 'Avatar.tsx', 'settings.ts']} />
            <${PreviewModule} name="Home Feed" tone="tone-green" files=${['src/feed/', 'Timeline.tsx']} />
          </div>
        <//>
        <${PreviewPane} active=${previewTab === 'codehealth'}>
          <div class="pv-health">
            <${PreviewHealth} name="Co-location" score="92%" tone="tone-green" />
            <${PreviewHealth} name="DRYness" score="74%" tone="tone-accent" />
            <${PreviewHealth} name="Dead Code" score="38%" tone="tone-red" />
          </div>
        <//>
      </div>
    </section>

    <div class="welcome-load">
      <div class="preview-cta">
        Upload your <code>.cartograph/mapping.json</code> to get your own dashboard like this.
      </div>

      <div
        class=${`drop-zone ${dragging ? 'dragover' : ''}`}
        onDragLeave=${onDragLeave}
        onDragOver=${onDragOver}
        onDrop=${onDrop}
      >
        <div class="drop-zone-title">Drop <code>mapping.json</code> here</div>
        <div class="drop-zone-sub">or browse for the generated file</div>
        <label class="drop-zone-btn">
          Browse files
          <input
            accept=".json,application/json"
            hidden
            onChange=${(event) => onFile(event.target.files?.[0])}
            type="file"
          />
        </label>
        <button class="secondary-btn" onClick=${onRefresh} type="button">
          Refresh local data
        </button>
        ${message ? html`<div class="drop-zone-error">${message}</div>` : null}
      </div>
    </div>

    <div class="welcome-footer">
      <div class="welcome-divider"></div>
      <a href="https://cartograph.sh" target="_blank" rel="noopener noreferrer">
        Learn more at cartograph.sh ->
      </a>
    </div>
  </main>`
}

function PreviewTab({ active, id, label, setPreviewTab }) {
  return html`<button
    class=${`preview-pill ${active ? 'active' : ''}`}
    onClick=${() => setPreviewTab(id)}
    type="button"
  >
    ${label}
  </button>`
}

function PreviewPane({ active, children }) {
  return html`<div class=${`preview-pane ${active ? 'active' : ''}`}>${children}</div>`
}

function PreviewStat({ label, value }) {
  return html`<div class="pv-stat">
    <div class="pv-stat-num">${value}</div>
    <div class="pv-stat-label">${label}</div>
  </div>`
}

function PreviewList({ items }) {
  return html`<div class="pv-list">
    ${items.map((item) => html`<div class="pv-row" key=${item}>${item}</div>`)}
  </div>`
}

function PreviewModule({ files, name, tone }) {
  return html`<div class=${`pv-module ${tone}`}>
    <div class="pv-module-name">${name}</div>
    <div class="pv-module-boxes">
      ${files.map((file) => html`<div class="pv-module-box" key=${file}>${file}</div>`)}
    </div>
  </div>`
}

function PreviewHealth({ name, score, tone }) {
  return html`<div class="pv-health-row">
    <div>
      <span class=${`pv-health-dot ${tone}`}></span>
      <span>${name}</span>
    </div>
    <strong class=${tone}>${score}</strong>
  </div>`
}
