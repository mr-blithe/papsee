import { describe, expect, it } from 'vitest'
import { decodeDayPayload, encodeDayPayload, PapDayPayloadError, type DayPayloadCard } from './day-payload'
import { importPapData, loaderFor, readCardMetadata, buildDigitalDay } from './index'
import { assignFilesToDays } from './files'
import { writeSyntheticCard } from './synthetic/resmed-card'

const RESMED = loaderFor('resmed')!

const SEED = 'papsee-day-payload'
const DATE = '2026-07-14'

const card = writeSyntheticCard({ seed: SEED, dates: [DATE] })

function encodeNight() {
  const metadata = readCardMetadata(card)
  const datalog = card.filter((file) => !RESMED.isCardLevel(file.path))
  const assignment = assignFilesToDays(datalog.map((file) => file.path))
  const files = datalog.filter((file) => assignment.get(file.path) === DATE)
  const summary = metadata.daySummaries.find((candidate) => candidate.date === DATE) ?? null
  const info: DayPayloadCard = {
    brand: metadata.brand,
    device: metadata.device,
    settingGroups: metadata.settingGroups,
    unreadable: metadata.unreadable,
  }

  return encodeDayPayload(info, buildDigitalDay('resmed', DATE, files, summary).day)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('the night a panel reads back', () => {
  it('rebuilds the night the parser produced, sample for sample, so a stored night is not a second parse', () => {
    const parsed = importPapData(card)
    const replayed = decodeDayPayload(toArrayBuffer(encodeNight()))

    expect(replayed.days).toEqual(parsed.days.filter((day) => day.date === DATE))
  })

  it('carries the device and the current settings, which the panel shows beside the night', () => {
    const parsed = importPapData(card)
    const replayed = decodeDayPayload(toArrayBuffer(encodeNight()))

    expect(replayed.brand).toBe(parsed.brand)
    expect(replayed.device).toEqual(parsed.device)
    expect(replayed.settingGroups).toEqual(parsed.settingGroups)
  })

  it('decodes correctly when the payload does not start on an even byte, which an Int16Array view cannot', () => {
    const encoded = encodeNight()
    const shifted = new Uint8Array(encoded.byteLength + 1)
    shifted.set(encoded, 1)

    expect(decodeDayPayload(toArrayBuffer(shifted.subarray(1)))).toEqual(decodeDayPayload(toArrayBuffer(encoded)))
  })

  it('refuses a truncated payload rather than rendering a night that ends early', () => {
    const encoded = encodeNight()

    expect(() => decodeDayPayload(toArrayBuffer(encoded.subarray(0, encoded.byteLength - 64)))).toThrow(
      PapDayPayloadError,
    )
  })

  it('refuses a body that is not a day payload at all', () => {
    expect(() => decodeDayPayload(new TextEncoder().encode('not a payload at all').buffer as ArrayBuffer)).toThrow(
      PapDayPayloadError,
    )
  })

  it('refuses a header that claims to be longer than the payload', () => {
    const encoded = encodeNight()
    new DataView(encoded.buffer, encoded.byteOffset).setUint32(4, encoded.byteLength * 2, true)

    expect(() => decodeDayPayload(toArrayBuffer(encoded))).toThrow(PapDayPayloadError)
  })
})
