import type { JsonObject, SwitchTab } from '../../types'
import { Badge, MetricCard } from '../../components/common'
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
} from '../../lib/cartograph'

export function Overview({
  data,
  switchTab,
}: {
  data: JsonObject
  switchTab: SwitchTab
}) {
  const surfaces = arr(data, 'surfaces')
  const features = arr(data, 'features')
  const flows = arr(data, 'flows')
  const entities = arr(data, 'entities')
  const metrics = arr(record(data, 'codeHealth'), 'metrics')
  const techStack = arr(data, 'techStack')
  const invariants = getInvariants(data)

  return (
    <div className="overview-stack">
      <section className="overview-stats-grid">
        <MetricCard label="Surfaces" value={surfaces.length} />
        <MetricCard label="Features" value={features.length} />
        <MetricCard label="Entities" value={entities.length} />
        <MetricCard label="Flows" value={flows.length} />
        <MetricCard label="Files" value={trackedFileCount(data)} />
      </section>

      {metrics.length ? (
        <section className="overview-strip">
          <div>
            <div className="overview-section-title">Code health</div>
            <div className="health-row">
              {metrics.map((metric) => (
                <button
                  className="health-pill"
                  key={itemId(metric)}
                  onClick={() => switchTab('codehealth')}
                  type="button"
                >
                  <span className={`score-dot ${metricState(metric)}`} />
                  {text(metric, 'name') || itemId(metric)} {Math.round(num(metric, 'score'))}%
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {invariants ? (
        <section className="overview-strip">
          <div>
            <div className="overview-section-title">Invariants</div>
            <button className="health-pill" onClick={() => switchTab('invariants')} type="button">
              <span className={`score-dot ${num(invariants.summary, 'failing') > 0 ? 'red' : 'green'}`} />
              {num(invariants.summary, 'passing')}/{num(invariants.summary, 'total')} passing
            </button>
          </div>
        </section>
      ) : null}

      {techStack.length ? (
        <section className="overview-strip">
          <div>
            <div className="overview-section-title">Tech stack</div>
            <div className="chip-row">
              {techStack.slice(0, 10).map((item) => (
                <button
                  className="detail-chip"
                  key={itemId(item)}
                  onClick={() => switchTab('techstack')}
                  type="button"
                >
                  {text(item, 'name')}
                  {text(item, 'version') ? ` ${text(item, 'version')}` : ''}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="overview-section-title">Surfaces</div>
        <div className="overview-card-grid">
          {surfaces.map((surface, index) => (
            <button
              className="overview-card"
              key={itemId(surface, index)}
              onClick={() => switchTab('surfaces', itemId(surface, index))}
              type="button"
            >
              <span className="card-title">{text(surface, 'name') || 'Unnamed surface'}</span>
              <span className="card-desc">{text(surface, 'description')}</span>
              <span className="card-meta">
                <Badge>{text(surface, 'actor') || 'surface'}</Badge>
                {entryRoute(surface)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="overview-section-title">Feature breakdown</div>
        <div className="breakdown-list">
          {groupBy(features, (feature) => text(feature, 'kind') || 'other').map(
            ([kind, items]) => (
              <div className="breakdown-row" key={kind}>
                <span>{kind} ({items.length})</span>
                <div className="inline-links">
                  {items.slice(0, 8).map((feature, index) => (
                    <button
                      key={itemId(feature, index)}
                      onClick={() => switchTab('features', itemId(feature, index))}
                      type="button"
                    >
                      {text(feature, 'name')}
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section>
        <div className="overview-section-title">Key flows</div>
        <div className="overview-card-grid two">
          {flows.slice(0, 8).map((flow, index) => (
            <button
              className="overview-card"
              key={itemId(flow, index)}
              onClick={() => switchTab('flows', itemId(flow, index))}
              type="button"
            >
              <span className="card-title">{text(flow, 'name') || 'Unnamed flow'}</span>
              <span className="card-desc">{text(flow, 'description')}</span>
              <span className="card-meta">
                <Badge>{text(flow, 'actor') || 'flow'}</Badge>
                {arr(flow, 'steps').length} steps
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
