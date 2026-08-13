// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { assignFilesToDays, buildDigitalDay, loaderFor } from '@/lib/pap'
import { writeSyntheticCard } from '@/lib/pap/synthetic/resmed-card'

vi.mock('@/lib/db', () => ({ db: {} }))

const { parsedNothing } = await import('./commit')

const RESMED = loaderFor('resmed')!
const SEED = 'papsee-commit-test'
const DATES = ['2026-07-14', '2026-07-15']

const card = writeSyntheticCard({ seed: SEED, dates: DATES })
const datalog = card.filter((file) => !RESMED.isCardLevel(file.path))
const assignment = assignFilesToDays(datalog.map((file) => file.path))

function filesFor(date: string) {
  return datalog.filter((file) => assignment.get(file.path) === date)
}

describe('deciding whether a night parsed into anything', () => {
  it('says a night that really parsed did, so a slept through night is never dropped', () => {
    const built = buildDigitalDay('resmed', DATES[0], filesFor(DATES[0]), null)

    expect(built.unreadable).toEqual([])
    expect(built.day.sessions.length).toBeGreaterThan(0)
    expect(parsedNothing(built)).toBe(false)
  })

  it('says a night whose files could not be read parsed into nothing', () => {
    const broken = filesFor(DATES[0]).map((file) => ({ path: file.path, data: new ArrayBuffer(8) }))
    const built = buildDigitalDay('resmed', DATES[0], broken, null)

    expect(built.unreadable).toEqual([DATES[0]])
    expect(built.day.sessions).toEqual([])
    expect(parsedNothing(built)).toBe(true)
  })

  it('says a night whose every session belongs to another one parsed into nothing, so it is not stored as zero usage and AHI 0', () => {
    const built = buildDigitalDay('resmed', DATES[1], filesFor(DATES[0]), null)

    expect(built.unreadable).toEqual([])
    expect(built.day.sessions).toEqual([])
    expect(parsedNothing(built)).toBe(true)
  })

  it('says a night handed no files at all parsed into nothing', () => {
    const built = buildDigitalDay('resmed', DATES[0], [], null)

    expect(built.unreadable).toEqual([])
    expect(built.day.sessions).toEqual([])
    expect(parsedNothing(built)).toBe(true)
  })
})
