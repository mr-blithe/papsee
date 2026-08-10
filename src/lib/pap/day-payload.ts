import { toPapDay, type DigitalChannel, type DigitalDay, type DigitalSession } from './digital'
import type { CardBrand } from './detect'
import type { ChannelId, DeviceInfo, PapDay, PapEvent, PapImport, SettingGroup } from './types'

const MAGIC = 'PAPD'
const MAGIC_BYTES = 4
const FRAME_BYTES = MAGIC_BYTES + 4
const MAX_HEADER_BYTES = 4 * 1024 * 1024

export class PapDayPayloadError extends Error {}

interface ChannelHeader {
  id: ChannelId
  unit: string
  intervalMs: number
  startMs: number
  scale: number
  offset: number
  bytes: number
}

interface SessionHeader {
  startMs: number
  endMs: number
  events: PapEvent[]
  channels: ChannelHeader[]
}

interface DayPayloadHeader {
  brand: CardBrand | null
  device: DeviceInfo | null
  settingGroups: SettingGroup[]
  unreadable: string[]
  date: string
  startMs: number
  endMs: number
  summary: DigitalDay['summary']
  settings: DigitalDay['settings']
  sessions: SessionHeader[]
}

export interface DayPayloadCard {
  brand: CardBrand | null
  device: DeviceInfo | null
  settingGroups: SettingGroup[]
  unreadable: string[]
}

function toHeader(card: DayPayloadCard, day: DigitalDay): DayPayloadHeader {
  return {
    brand: card.brand,
    device: card.device,
    settingGroups: card.settingGroups,
    unreadable: card.unreadable,
    date: day.date,
    startMs: day.startMs,
    endMs: day.endMs,
    summary: day.summary,
    settings: day.settings,
    sessions: day.sessions.map((session) => ({
      startMs: session.startMs,
      endMs: session.endMs,
      events: session.events,
      channels: session.channels.map((channel) => ({
        id: channel.id,
        unit: channel.unit,
        intervalMs: channel.intervalMs,
        startMs: channel.startMs,
        scale: channel.scale,
        offset: channel.offset,
        bytes: channel.samples.byteLength,
      })),
    })),
  }
}

/**
 * The framing header, padded so the sample blocks that follow start on an even byte. Nothing may
 * assume that alignment when decoding, but keeping it costs one byte and makes the payload readable
 * by tools that do.
 */
export function encodeDayPayloadHeader(card: DayPayloadCard, day: DigitalDay): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(toHeader(card, day)))
  const padding = json.length % 2
  const header = new Uint8Array(FRAME_BYTES + json.length + padding)

  header.set(new TextEncoder().encode(MAGIC), 0)
  new DataView(header.buffer).setUint32(MAGIC_BYTES, json.length + padding, true)
  header.set(json, FRAME_BYTES)

  return header
}

export function encodeDayPayload(card: DayPayloadCard, day: DigitalDay): Uint8Array {
  const header = encodeDayPayloadHeader(card, day)
  const samples = day.sessions.flatMap((session) => session.channels.map((channel) => channel.samples))
  const total = samples.reduce((sum, block) => sum + block.byteLength, header.length)
  const payload = new Uint8Array(total)

  payload.set(header, 0)
  let offset = header.length
  for (const block of samples) {
    payload.set(block, offset)
    offset += block.byteLength
  }

  return payload
}

export function decodeDayPayload(buffer: ArrayBuffer): PapImport {
  const bytes = new Uint8Array(buffer)
  if (bytes.byteLength < FRAME_BYTES) throw new PapDayPayloadError('payload is too short to hold a header')

  const magic = new TextDecoder().decode(bytes.subarray(0, MAGIC_BYTES))
  if (magic !== MAGIC) throw new PapDayPayloadError('payload does not start with a day payload header')

  const headerBytes = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(MAGIC_BYTES, true)
  if (headerBytes > MAX_HEADER_BYTES) throw new PapDayPayloadError('header claims an implausible length')
  if (FRAME_BYTES + headerBytes > bytes.byteLength) throw new PapDayPayloadError('header runs past the payload')

  const json = new TextDecoder().decode(bytes.subarray(FRAME_BYTES, FRAME_BYTES + headerBytes)).replace(/\0+$/, '')

  let header: DayPayloadHeader
  try {
    header = JSON.parse(json) as DayPayloadHeader
  } catch {
    throw new PapDayPayloadError('header is not readable JSON')
  }

  let offset = FRAME_BYTES + headerBytes
  const sessions: DigitalSession[] = header.sessions.map((session) => ({
    startMs: session.startMs,
    endMs: session.endMs,
    events: session.events,
    channels: session.channels.map((channel): DigitalChannel => {
      const end = offset + channel.bytes
      if (end > bytes.byteLength) throw new PapDayPayloadError('a channel runs past the end of the payload')
      const samples = bytes.subarray(offset, end)
      offset = end

      return {
        id: channel.id,
        unit: channel.unit,
        intervalMs: channel.intervalMs,
        startMs: channel.startMs,
        scale: channel.scale,
        offset: channel.offset,
        samples,
      }
    }),
  }))

  const day: PapDay = toPapDay({
    date: header.date,
    startMs: header.startMs,
    endMs: header.endMs,
    sessions,
    summary: header.summary,
    settings: header.settings,
  })

  return {
    brand: header.brand,
    device: header.device,
    settingGroups: header.settingGroups,
    unreadable: header.unreadable,
    days: [day],
  }
}
