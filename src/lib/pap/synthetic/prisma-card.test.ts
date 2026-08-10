import { describe, expect, it } from 'vitest'
import { detectCard } from '../detect'
import { parseEdf } from '../edf/header'
import { writeSyntheticPrismaCard } from './prisma-card'
import type { PapFile } from '../types'

const SEED = 'papsee-prisma-fixture'
const DATES = ['2026-07-14', '2026-07-15']

const card = writeSyntheticPrismaCard({ seed: SEED, dates: DATES })
const paths = card.map((file) => file.path)

function find(match: RegExp): PapFile {
  const file = card.find((entry) => match.test(entry.path))
  if (!file) throw new Error(`no file matching ${match}`)
  return file
}

describe('the shape of the Prisma card the writer emits', () => {
  it('writes the config file the brand is fingerprinted by, or the card would never be detected', () => {
    expect(paths).toContain('config.pscfg')
    expect(detectCard(paths)).toBe('lowensteinPrisma')
  })

  it('pairs every waveform file with an event file in the same directory', () => {
    const signals = paths.filter((path) => path.endsWith('.wmedf'))

    expect(signals.length).toBeGreaterThan(1)
    for (const path of signals) {
      expect(paths, path).toContain(path.replace('signal_', 'event_').replace('.wmedf', '.xml'))
    }
  })

  it('names the day directory something that is not a date, so nothing may read the day off it', () => {
    const directories = new Set(paths.filter((path) => path.includes('/')).map((path) => path.split('/')[1]))

    expect(directories.size).toBe(DATES.length)
    for (const directory of directories) {
      expect(directory, directory).not.toMatch(/^20\d{6}$/)
    }
  })

  it('reuses the same session id under different days, which is what makes pairing on the id alone wrong', () => {
    const ids = paths
      .filter((path) => path.endsWith('.wmedf'))
      .map((path) => path.split('/').pop()?.replace('signal_', '').replace('.wmedf', ''))

    expect(new Set(ids).size).toBeLessThan(ids.length)
  })
})

describe('the waveform file a Prisma session writes', () => {
  it('declares a sample width per signal, which is the one thing WMEDF adds to EDF', () => {
    const edf = parseEdf(find(/\.wmedf$/).data)
    const reserved = new Map(edf.signals.map((signal) => [signal.label, signal.reserved]))

    expect(reserved.get('RespFlow')).toBe('#2')
    expect(reserved.get('Pressure')).toBe('#1')
    expect(reserved.get('LeakFlowBreath')).toBe('#1')
  })

  it('carries a start clock, which is the only place the therapy day can come from', () => {
    const edf = parseEdf(find(/\.wmedf$/).data)

    expect(edf.startTime.getTime()).toBeGreaterThan(Date.UTC(2026, 0, 1))
    expect(edf.recordDuration).toBe(1)
  })
})

describe('the event file a Prisma session writes', () => {
  const xml = new TextDecoder().decode(find(/event_\d+\.xml$/).data)

  it('writes the settings the device was running as parameter rows', () => {
    expect(xml).toContain('DeviceEventID="0"')
    expect(xml).toContain('ParameterID="6"')
    expect(xml).toContain('ParameterID="9"')
  })

  it('writes a scored event by its end, because that is when the device flags one', () => {
    const match = /RespEventID="(\d+)" EndTime="(\d+)" Duration="(\d+)"/.exec(xml)

    expect(match).not.toBeNull()
    expect(Number(match?.[2])).toBeGreaterThan(Number(match?.[3]))
  })

  it('scores no event the device has no id for, rather than inventing one', () => {
    expect(xml).not.toContain('RespEventID="0"')
    expect(xml).not.toContain('RespEventID="undefined"')
  })
})
