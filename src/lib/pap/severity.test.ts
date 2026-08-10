import { describe, expect, it } from 'vitest'
import { AHI_SEVERITY_BANDS, AHI_SEVERITY_IDS, ahiSeverity, severityBand } from './severity'

describe('the conventional AHI severity bands', () => {
  it('places the boundaries at 5, 15 and 30', () => {
    expect(AHI_SEVERITY_BANDS.map((band) => [band.id, band.from, band.to])).toEqual([
      ['normal', 0, 5],
      ['mild', 5, 15],
      ['moderate', 15, 30],
      ['severe', 30, null],
    ])
  })

  it('leaves no gap and no overlap between one band and the next', () => {
    for (let index = 1; index < AHI_SEVERITY_BANDS.length; index += 1) {
      expect(AHI_SEVERITY_BANDS[index].from).toBe(AHI_SEVERITY_BANDS[index - 1].to)
    }
  })

  it('lists every band id in ascending order of severity', () => {
    expect(AHI_SEVERITY_IDS).toEqual(['normal', 'mild', 'moderate', 'severe'])
    expect(AHI_SEVERITY_BANDS.map((band) => band.id)).toEqual([...AHI_SEVERITY_IDS])
  })
})

describe('classifying a night by its AHI', () => {
  it('treats a value below five as normal', () => {
    expect(ahiSeverity(0)).toBe('normal')
    expect(ahiSeverity(4.9)).toBe('normal')
  })

  it('calls exactly five mild rather than normal', () => {
    expect(ahiSeverity(5)).toBe('mild')
  })

  it('keeps the whole mild range mild, up to but not including fifteen', () => {
    expect(ahiSeverity(5.1)).toBe('mild')
    expect(ahiSeverity(14.9)).toBe('mild')
  })

  it('calls exactly fifteen moderate rather than mild', () => {
    expect(ahiSeverity(15)).toBe('moderate')
  })

  it('keeps the whole moderate range moderate, up to but not including thirty', () => {
    expect(ahiSeverity(15.1)).toBe('moderate')
    expect(ahiSeverity(29.9)).toBe('moderate')
  })

  it('calls exactly thirty severe rather than moderate', () => {
    expect(ahiSeverity(30)).toBe('severe')
  })

  it('keeps every value above thirty severe, however high', () => {
    expect(ahiSeverity(30.1)).toBe('severe')
    expect(ahiSeverity(120)).toBe('severe')
  })

  it('reports a night the device recorded as zero events as normal, not as missing', () => {
    expect(ahiSeverity(0)).toBe('normal')
  })

  it('classifies the device truncated tenth the device itself reports', () => {
    expect(ahiSeverity(4.9)).toBe('normal')
    expect(ahiSeverity(14.9)).toBe('mild')
    expect(ahiSeverity(29.9)).toBe('moderate')
  })
})

describe('looking the band up rather than just its name', () => {
  it('returns the band that contains the value, so a chart can draw its bounds', () => {
    expect(severityBand(22).id).toBe('moderate')
    expect(severityBand(22).from).toBe(15)
    expect(severityBand(22).to).toBe(30)
  })

  it('returns an unbounded upper edge for the severe band', () => {
    expect(severityBand(45).id).toBe('severe')
    expect(severityBand(45).to).toBeNull()
  })
})
