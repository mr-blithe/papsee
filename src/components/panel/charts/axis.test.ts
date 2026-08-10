import { describe, expect, it } from 'vitest'
import { formatAxisValue, verticalAxisSplits } from './axis'

describe('the labels down the left of a chart', () => {
  it('always labels the bottom and the top of the range, so a reader can see the scale', () => {
    for (const range of [
      [-132.3, 132.3],
      [0, 12.5],
      [90, 100],
      [0, 0.6],
    ] as [number, number][]) {
      const splits = verticalAxisSplits(range)

      expect(splits[0], `bottom of ${range}`).toBe(range[0])
      expect(splits.at(-1), `top of ${range}`).toBe(range[1])
    }
  })

  it('puts zero in the middle of a range that crosses it, rather than an arbitrary midpoint', () => {
    expect(verticalAxisSplits([-132.3, 132.3])).toEqual([-132.3, 0, 132.3])
    expect(verticalAxisSplits([-40, 10])).toEqual([-40, 0, 10])
  })

  it('rounds the middle label of a one sided range to something readable', () => {
    expect(verticalAxisSplits([0, 12.5])).toEqual([0, 6, 12.5])
    expect(verticalAxisSplits([90, 100])).toEqual([90, 95, 100])
  })

  it('keeps the middle strictly inside the range, so no label lands on top of another', () => {
    for (const range of [
      [0, 1],
      [4.9, 5],
      [-0.001, 0.001],
      [0, 1e-6],
    ] as [number, number][]) {
      const splits = verticalAxisSplits(range)
      const middle = splits.length === 3 ? splits[1] : null

      expect(new Set(splits).size, `duplicate label in ${splits}`).toBe(splits.length)
      if (middle !== null) {
        expect(middle > range[0] && middle < range[1], `${middle} outside ${range}`).toBe(true)
      }
    }
  })

  it('falls back to a single label rather than drawing a broken axis for an empty range', () => {
    expect(verticalAxisSplits([5, 5])).toEqual([5])
    expect(verticalAxisSplits([10, 2])).toEqual([10])
    expect(verticalAxisSplits([Number.NaN, 1])).toEqual([Number.NaN])
  })
})

describe('formatting an axis label', () => {
  it('drops decimals a wide range does not need and keeps the ones a narrow range does', () => {
    expect(formatAxisValue(-132.3, 264.6)).toBe('-132')
    expect(formatAxisValue(12.5, 12.5)).toBe('12.5')
    expect(formatAxisValue(0.35, 0.6)).toBe('0.35')
  })

  it('writes a whole number as a whole number rather than padding it with zeros', () => {
    expect(formatAxisValue(0, 12.5)).toBe('0')
    expect(formatAxisValue(6, 12.5)).toBe('6')
  })
})
