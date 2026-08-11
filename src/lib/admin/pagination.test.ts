import { describe, expect, it } from 'vitest'
import { ADMIN_PAGE_SIZE, pageCount, pageOffset, parsePage } from './pagination'

describe('parsePage', () => {
  // A page number straight off the query string reaches SQL as an OFFSET, and Postgres refuses a
  // negative one, so anything but a whole page above zero has to land on the first page instead.
  it('falls back to the first page for anything that is not a page number', () => {
    for (const value of [null, '', '0', '-3', 'abc', '1.5', '2e3', ' ', 'Infinity', 'NaN']) {
      expect(parsePage(value), JSON.stringify(value)).toBe(1)
    }
  })

  it('reads a page number a reader could have bookmarked', () => {
    expect(parsePage('1')).toBe(1)
    expect(parsePage('2')).toBe(2)
    expect(parsePage('47')).toBe(47)
  })
})

describe('pageOffset', () => {
  it('starts the first page at the top of the table rather than one page in', () => {
    expect(pageOffset(1)).toBe(0)
  })

  it('skips one whole page per page before the requested one', () => {
    expect(pageOffset(2)).toBe(ADMIN_PAGE_SIZE)
    expect(pageOffset(3)).toBe(ADMIN_PAGE_SIZE * 2)
  })
})

describe('pageCount', () => {
  // "Page 1 of 0" is what an empty table shows if this rounds the obvious way, and a full first
  // page reporting two pages sends a reader to an empty second one.
  it('reports one page for an empty table', () => {
    expect(pageCount(0)).toBe(1)
  })

  it('reports one page for exactly one full page', () => {
    expect(pageCount(ADMIN_PAGE_SIZE)).toBe(1)
  })

  it('opens a second page as soon as one row does not fit', () => {
    expect(pageCount(ADMIN_PAGE_SIZE + 1)).toBe(2)
  })

  it('counts a partly filled last page', () => {
    expect(pageCount(ADMIN_PAGE_SIZE * 3 - 1)).toBe(3)
    expect(pageCount(ADMIN_PAGE_SIZE * 3)).toBe(3)
    expect(pageCount(ADMIN_PAGE_SIZE * 3 + 1)).toBe(4)
  })
})
