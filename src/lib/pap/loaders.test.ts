import { describe, expect, it } from 'vitest'
import { BRAND_NAMES, isSupported, RECOGNISED_BRANDS, type CardBrand } from './detect'
import { buildDigitalDay } from './index'
import { CARD_LOADERS, loaderFor } from './loaders'

const REGISTERED = Object.keys(CARD_LOADERS) as CardBrand[]
const ALL_BRANDS = Object.keys(BRAND_NAMES) as CardBrand[]

describe('the brands that claim to be readable', () => {
  it('has a loader for every brand it calls supported, or the card would import as an empty night', () => {
    for (const brand of ALL_BRANDS.filter(isSupported)) {
      expect(loaderFor(brand), brand).not.toBeNull()
    }
  })

  it('calls every registered loader supported, or its reader would never be reached', () => {
    for (const brand of REGISTERED) {
      expect(isSupported(brand), brand).toBe(true)
    }
  })

  it('leaves a recognised brand without a loader, so it is named and refused rather than misread', () => {
    for (const brand of RECOGNISED_BRANDS) {
      expect(loaderFor(brand), brand).toBeNull()
    }
  })
})

describe('asking for a night of a brand nothing can read', () => {
  it('returns no sessions rather than running another brand reader over it', () => {
    const built = buildDigitalDay(
      'lowensteinPrisma',
      '2026-08-08',
      [{ path: 'x/signal_1.wmedf', data: new ArrayBuffer(8) }],
      null,
    )

    expect(built.day.sessions).toEqual([])
    expect(built.unreadable).toEqual([])
  })

  it('reports nothing at all for a null brand, which is what an unrecognised card resolves to', () => {
    expect(loaderFor(null)).toBeNull()
  })
})
