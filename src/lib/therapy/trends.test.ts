import { describe, expect, it } from 'vitest'
import { daysBetween, linearTrend, percentageChange, previousWindow, shiftDayKey, summariseTrend } from './trends'

describe('walking day keys', () => {
  it('crosses a month boundary rather than running past the end of the month', () => {
    expect(shiftDayKey('2026-07-31', 1)).toBe('2026-08-01')
    expect(shiftDayKey('2026-08-01', -1)).toBe('2026-07-31')
  })

  it('crosses a leap day, which a naive 30 day month would skip', () => {
    expect(shiftDayKey('2028-02-28', 1)).toBe('2028-02-29')
    expect(shiftDayKey('2028-03-01', -1)).toBe('2028-02-29')
  })

  it('counts a window inclusively, so one day is one night and not zero', () => {
    expect(daysBetween({ from: '2026-08-08', to: '2026-08-08' })).toBe(1)
    expect(daysBetween({ from: '2026-08-01', to: '2026-08-30' })).toBe(30)
  })
})

describe('the window a range is compared against', () => {
  it('ends the day before the current window starts and has the same length', () => {
    expect(previousWindow({ from: '2026-08-01', to: '2026-08-30' })).toEqual({ from: '2026-07-02', to: '2026-07-31' })
  })

  it('never overlaps the window it precedes, which would double count a night', () => {
    const current = { from: '2026-03-05', to: '2026-03-11' }
    const earlier = previousWindow(current)

    expect(earlier.to < current.from).toBe(true)
    expect(daysBetween(earlier)).toBe(daysBetween(current))
  })
})

describe('summarising a run of nights', () => {
  it('ignores nights the device never reported rather than counting them as zero', () => {
    const summary = summariseTrend([10, null, 20, undefined, 30])

    expect(summary.nights).toBe(3)
    expect(summary.average).toBe(20)
  })

  it('reports nothing at all for a range with no readings, instead of a misleading zero', () => {
    expect(summariseTrend([null, null])).toEqual({ average: null, percentile95: null, nights: 0 })
  })

  it('takes the 95th percentile from the sorted values, not from the order they arrived in', () => {
    const values = [50, 1, 2, 3, 4, 5, 6, 7, 8, 9]

    expect(summariseTrend(values).percentile95).toBe(50)
    expect(summariseTrend([...values].reverse()).percentile95).toBe(50)
  })

  it('returns the single reading itself when only one night has data', () => {
    expect(summariseTrend([7.5]).percentile95).toBe(7.5)
    expect(summariseTrend([7.5]).average).toBe(7.5)
  })
})

describe('comparing a window against the one before it', () => {
  it('reports the direction and size of the change', () => {
    expect(percentageChange(12, 10)).toBeCloseTo(20)
    expect(percentageChange(8, 10)).toBeCloseTo(-20)
  })

  it('refuses to divide by a previous window of zero, which would read as infinite improvement', () => {
    expect(percentageChange(5, 0)).toBeNull()
    expect(percentageChange(5, null)).toBeNull()
    expect(percentageChange(null, 5)).toBeNull()
  })
})

describe('the trend line drawn over a run of nights', () => {
  it('follows a straight run exactly, so a flat stretch is not drawn sloping', () => {
    expect(linearTrend([4, 4, 4, 4])).toEqual([4, 4, 4, 4])
    expect(linearTrend([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
  })

  it('keeps its slope across nights with no reading, rather than treating a gap as a zero', () => {
    expect(linearTrend([2, null, 6, null, 10])).toEqual([2, 4, 6, 8, 10])
  })

  it('reports nothing when a slope would be invented from a single night', () => {
    expect(linearTrend([7])).toBeNull()
    expect(linearTrend([null, null])).toBeNull()
  })
})
