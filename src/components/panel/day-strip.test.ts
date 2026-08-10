import { describe, expect, it } from 'vitest'
import { windowAround } from './day-strip'

const AUGUST = Array.from({ length: 31 }, (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}`)
const RADIUS = 4
const WIDTH = RADIUS * 2 + 1

describe('the days a phone shows around the selected night', () => {
  it('keeps the selected night in the middle when there is room on both sides', () => {
    const shown = windowAround(AUGUST, '2026-08-15', RADIUS)

    expect(shown).toHaveLength(WIDTH)
    expect(shown[RADIUS]).toBe('2026-08-15')
  })

  it('still shows a full window at the start of the month instead of running off the front', () => {
    const shown = windowAround(AUGUST, '2026-08-01', RADIUS)

    expect(shown).toHaveLength(WIDTH)
    expect(shown[0]).toBe('2026-08-01')
    expect(shown).toContain('2026-08-01')
  })

  it('still shows a full window at the end of the month instead of running off the back', () => {
    const shown = windowAround(AUGUST, '2026-08-31', RADIUS)

    expect(shown).toHaveLength(WIDTH)
    expect(shown.at(-1)).toBe('2026-08-31')
  })

  it('shows a short month whole rather than padding it', () => {
    const week = AUGUST.slice(0, 5)

    expect(windowAround(week, '2026-08-03', RADIUS)).toEqual(week)
  })

  it('falls back to the front of the month when the selection is in another one', () => {
    const shown = windowAround(AUGUST, '2026-07-14', RADIUS)

    expect(shown).toHaveLength(WIDTH)
    expect(shown[0]).toBe('2026-08-01')
  })
})
