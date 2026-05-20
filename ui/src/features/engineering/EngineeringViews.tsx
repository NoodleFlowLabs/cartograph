import type { JsonObject, SwitchTab } from '../../types'
import { CardSection, CopyButton, DetailHeader, EmptyState, InfoCard, LinkedSection } from '../../components/common'
import {
  arr,
  buildEntityContext,
  exposureLabel,
  itemId,
  metricState,
  nodeStyle,
  num,
  record,
  sourceLabel,
  strArray,
  text,
} from '../../lib/cartograph'

export function EntityPanel({
  data,
  entity,
  setSelectedId,
}: {
  data: JsonObject
  entity: JsonObject
  setSelectedId: (id: string) => void
}) {
  const entities = arr(data, 'entities')
  const renderedEntities = entities.slice(0, 32)
  const relationships = arr(data, 'relationships').filter(
    (relationship) =>
      text(relationship, 'from') === itemId(entity) ||
      text(relationship, 'to') === itemId(entity),
  )

  return (
    <div className="split-panel">
      <div className="graph-panel">
        {renderedEntities.map((item, index) => (
          <button
            className={`entity-node ${itemId(item) === itemId(entity) ? 'active' : ''}`}
            key={itemId(item, index)}
            onClick={() => setSelectedId(itemId(item, index))}
            style={nodeStyle(index, renderedEntities.length)}
            type="button"
          >
            <span>{text(item, 'name')}</span>
            <small>{text(item, 'kind')}</small>
          </button>
        ))}
      </div>
      <div className="detail-stack side-detail">
        <DetailHeader
          actions={<CopyButton text={buildEntityContext(data, entity)} />}
          badges={[text(entity, 'kind'), exposureLabel(data, itemId(entity))]}
          description={text(entity, 'description')}
          meta={[sourceLabel(entity)]}
          title={text(entity, 'name') || 'Unnamed entity'}
        />
        <CardSection label="Fields">
          {arr(entity, 'fields').map((field, index) => (
            <InfoCard
              description={text(field, 'description')}
              key={itemId(field, index)}
              meta={text(field, 'type')}
              title={text(field, 'name')}
            />
          ))}
        </CardSection>
        <CardSection label="Relationships">
          {relationships.map((relationship, index) => (
            <InfoCard
              badges={[text(relationship, 'type')]}
              description={text(relationship, 'description')}
              key={itemId(relationship, index)}
              title={`${text(relationship, 'from')} -> ${text(relationship, 'to')}`}
            />
          ))}
        </CardSection>
      </div>
    </div>
  )
}

export function CompartmentPanel({
  compartment,
  data,
  setSelectedId,
}: {
  compartment: JsonObject
  data: JsonObject
  setSelectedId: (id: string) => void
}) {
  const children = arr(data, 'compartments').filter(
    (item) => text(item, 'parentId') === itemId(compartment),
  )
  const files = arr(compartment, 'files')

  return (
    <div className="detail-stack">
      <DetailHeader
        badges={strArray(compartment, 'tags')}
        description={text(compartment, 'description')}
        title={text(compartment, 'name') || 'Unnamed compartment'}
      />
      <LinkedSection
        items={children}
        label="Child compartments"
        onClick={(item) => setSelectedId(itemId(item))}
        subtitle={(item) => `${arr(item, 'files').length} files`}
      />
      <CardSection label={`Files (${files.length})`}>
        {files.map((file, index) => (
          <InfoCard
            badges={[text(file, 'role') || 'file']}
            description={text(file, 'description')}
            key={itemId(file, index)}
            title={text(file, 'file') || text(file, 'path')}
          />
        ))}
      </CardSection>
    </div>
  )
}

export function CodeHealthPanel({
  data,
  switchTab,
}: {
  data: JsonObject
  switchTab: SwitchTab
}) {
  const metrics = arr(record(data, 'codeHealth'), 'metrics')
  if (!metrics.length) return <EmptyState label="No code health data." />

  return (
    <div className="codehealth-layout">
      {metrics.map((metric) => (
        <section className="health-card" key={itemId(metric)}>
          <div className="health-card-header">
            <div>
              <h2>{text(metric, 'name')}</h2>
              <p>{text(metric, 'summary') || text(metric, 'description')}</p>
            </div>
            <span className={`health-score ${metricState(metric)}`}>
              {Math.round(num(metric, 'score'))}%
            </span>
          </div>
          <div className="finding-list">
            {arr(metric, 'findings').map((finding, index) => (
              <InfoCard
                actions={
                  <button
                    className="inline-action"
                    onClick={() => switchTab('codeorg')}
                    type="button"
                  >
                    View in code
                  </button>
                }
                badges={[text(finding, 'severity'), text(finding, 'kind')]}
                description={text(finding, 'reason') || text(finding, 'summary')}
                key={itemId(finding, index)}
                meta={text(finding, 'file') || text(finding, 'target')}
                title={text(finding, 'title') || text(finding, 'target') || `Finding ${index + 1}`}
              />
            ))}
            {!arr(metric, 'findings').length ? (
              <EmptyState compact label="No findings for this metric." />
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}
