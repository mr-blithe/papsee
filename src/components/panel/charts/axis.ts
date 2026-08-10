function axisDecimals(span: number): number {
  if (span >= 20) return 0
  if (span >= 2) return 1
  return 2
}

function roundedMiddle(min: number, max: number): number | null {
  if (min < 0 && max > 0) return 0
  const step = 10 ** (Math.floor(Math.log10(max - min)) - 1)
  const middle = Math.round((min + max) / 2 / step) * step

  return middle > min && middle < max ? middle : null
}

export function verticalAxisSplits([min, max]: [number, number]): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min]
  const middle = roundedMiddle(min, max)

  return middle === null ? [min, max] : [min, middle, max]
}

export function formatAxisValue(value: number, span: number): string {
  return String(Number(value.toFixed(axisDecimals(span))))
}

export interface DomainShape {
  symmetric?: boolean
  fromZero?: boolean
  band?: number
}

// A threshold nobody can see is not a threshold, so a banded axis always reaches past its line.
export function padDomain(min: number, max: number, shape: DomainShape): [number, number] {
  const ceiling = shape.band === undefined ? max : Math.max(max, shape.band * 1.08)

  if (shape.symmetric) {
    const extent = Math.max(Math.abs(min), Math.abs(ceiling)) * 1.05 || 1
    return [-extent, extent]
  }

  const span = ceiling - min || 1
  const lower = shape.fromZero ? Math.min(0, min) : min - span * 0.08

  return [lower, ceiling + span * 0.08]
}
