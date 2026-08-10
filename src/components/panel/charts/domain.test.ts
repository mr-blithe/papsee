import { describe, expect, it } from 'vitest'
import { LARGE_LEAK_THRESHOLD } from '@/lib/pap'
import { padDomain } from './axis'

const LEAK = { fromZero: true, band: LARGE_LEAK_THRESHOLD } as const
const PRESSURE = { fromZero: true } as const
const FLOW = { symmetric: true } as const

describe('the vertical range a chart is drawn against', () => {
  it('reaches past the leak threshold on a good night, so the line is on screen at all', () => {
    const [, top] = padDomain(0, 8.8, LEAK)

    expect(top).toBeGreaterThan(LARGE_LEAK_THRESHOLD)
  })

  it('still reaches past the readings on a leaky night, so nothing is clipped', () => {
    const [, top] = padDomain(0, 96, LEAK)

    expect(top).toBeGreaterThan(96)
  })

  it('leaves a chart with no threshold framed on its own readings', () => {
    const [bottom, top] = padDomain(0, 12.5, PRESSURE)

    expect(bottom).toBe(0)
    expect(top).toBeGreaterThan(12.5)
    expect(top).toBeLessThan(LARGE_LEAK_THRESHOLD)
  })

  it('keeps a symmetric chart centred on zero', () => {
    const [bottom, top] = padDomain(-120, 96, FLOW)

    expect(bottom).toBe(-top)
    expect(top).toBeGreaterThanOrEqual(120)
  })

  it('gives a flat channel a usable range instead of a zero height one', () => {
    const [bottom, top] = padDomain(0, 0, FLOW)

    expect(top).toBeGreaterThan(bottom)
  })
})
