import type { ReactNode } from 'react'
import type { TermId } from '@/lib/terms'
import { cn } from '@/lib/utils'
import { TermHint } from './term-hint'

export function PanelCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-xl border border-border bg-card text-card-foreground', className)}>
      {children}
    </section>
  )
}

export function PanelCardHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function PanelSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2 pt-2">
      <div className="px-0.5">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function DataList({
  items,
  wrap,
}: {
  items: { label: string; value: ReactNode; term?: TermId }[]
  wrap?: boolean
}) {
  return (
    <div className="@container">
      <dl className="grid gap-x-6 gap-y-3 @md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
            <dt className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {item.label}
              {item.term ? <TermHint term={item.term} /> : null}
            </dt>
            <dd className={cn('min-w-0 text-right text-sm font-medium tabular-nums', wrap && 'break-all')}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
