import { type ReactNode, useState } from 'react'
import type { JsonObject } from '../../types'
import { getInvariants, itemId, num, text } from '../../lib/cartograph'

export function DetailHeader({
  actions,
  badges,
  description,
  meta,
  title,
}: {
  actions?: ReactNode
  badges?: Array<string | undefined>
  description?: string
  meta?: Array<string | undefined>
  title: string
}) {
  return (
    <header className="detail-header">
      <div>
        <h1>{title}</h1>
        <div className="detail-meta">
          {(badges || []).filter(Boolean).map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
          {(meta || []).filter(Boolean).map((item) => (
            <span className="impl-path" key={item}>
              {item}
            </span>
          ))}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  )
}

export function LinkedSection({
  items,
  label,
  onClick,
  subtitle,
}: {
  items: JsonObject[]
  label: string
  onClick: (item: JsonObject) => void
  subtitle?: (item: JsonObject) => string
}) {
  return (
    <CardSection label={`${label} (${items.length})`}>
      {items.length ? (
        items.map((item) => (
          <button
            className="linked-item"
            key={itemId(item)}
            onClick={() => onClick(item)}
            type="button"
          >
            <span>{text(item, 'name') || itemId(item)}</span>
            {subtitle ? <small>{subtitle(item)}</small> : null}
          </button>
        ))
      ) : (
        <EmptyState compact label={`No ${label.toLowerCase()}.`} />
      )}
    </CardSection>
  )
}

export function CardSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section>
      <div className="section-title">{label}</div>
      <div className="card-list">{children}</div>
    </section>
  )
}

export function InfoCard({
  actions,
  badges,
  description,
  meta,
  title,
}: {
  actions?: ReactNode
  badges?: Array<string | undefined>
  description?: string
  meta?: string
  title?: string
}) {
  return (
    <div className="info-card">
      <div className="info-card-top">
        <strong>{title || 'Untitled'}</strong>
        <div className="chip-row">
          {(badges || []).filter(Boolean).map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
        </div>
      </div>
      {description ? <p>{description}</p> : null}
      {meta ? <div className="impl-path">{meta}</div> : null}
      {actions}
    </div>
  )
}

export function PromptBlock({ text: prompt }: { text: string }) {
  return (
    <div className="prompt-block">
      <CopyButton text={prompt} />
      <pre>{prompt}</pre>
    </div>
  )
}

export function CopyButton({ text: value }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button className="copy-btn" onClick={() => void copy()} type="button">
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function EmptyState({ compact, label }: { compact?: boolean; label: string }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}>{label}</div>
}

export function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="overview-stat-card">
      <div className="overview-stat-value">{value}</div>
      <div className="overview-stat-label">{label}</div>
    </div>
  )
}

export function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="preview-stat">
      <div>{value}</div>
      <span>{label}</span>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="stat-val">{value}</span>
      {label}
    </span>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  if (!children) return null
  return <span className="detail-tag">{children}</span>
}

export function InvariantBadge({ data }: { data: JsonObject | null }) {
  if (!data) return null
  const invariants = getInvariants(data)
  if (!invariants) return null
  const failing = num(invariants.summary, 'failing')
  const total = num(invariants.summary, 'total')
  return (
    <span className={`tab-badge ${failing ? 'has-failures' : 'all-passing'}`}>
      {failing ? `${failing}/${total}` : total}
    </span>
  )
}
