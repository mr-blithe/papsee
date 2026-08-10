import type { ReactNode } from 'react'

export function ChartFrame({
  label,
  unit,
  readout,
  children,
}: {
  label: ReactNode
  unit?: string
  readout?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="px-2 py-3 md:px-3">
      <div className="flex h-6 items-center justify-between gap-3 overflow-hidden px-2">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">{label}</span>
        <span className="flex min-w-0 items-center gap-2 truncate text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {readout}
          {unit ? <span className="shrink-0">{unit}</span> : null}
        </span>
      </div>
      {children}
    </div>
  )
}
