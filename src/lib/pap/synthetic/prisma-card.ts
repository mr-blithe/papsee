import { format } from 'date-fns'
import { deviceTimeAt } from '../device-time'
import { buildEdf, type EdfSignalSpec } from '../edf/writer'
import { planNights, type SyntheticNight, type SyntheticSession } from './night'
import type { ChannelId, PapEvent, PapEventType, PapFile } from '../types'

const DEVICE_ID = '0x92'
const SERIAL = '0x2FA1B3'
const MACHINE_DIR = '0003121587'
const HARDWARE_VERSION = 'WM090TD'

const EIGHT_BIT = '#1'
const SIXTEEN_BIT = '#2'

const RECORD_SECONDS = 1
const DECISECOND_MS = 100
// The night model plans a pressure in cmH2O and this device writes hectopascals, 98.0665 Pa to the
// cmH2O, so the fixture converts on the way out exactly as the machine would.
const HPA_PER_CM_H2O = 0.980665

interface PrismaSignalSpec {
  label: string
  channel: ChannelId
  unit: string
  physicalMin: number
  physicalMax: number
  digitalMin: number
  digitalMax: number
  hz: number
  bytesPerSample: 1 | 2
}

/**
 * What a Prisma Smart writes per session. Two of these are one byte wide on purpose, because that is
 * the deviation the format exists to exercise and a card of all wide signals would never reach it.
 */
const SIGNALS: PrismaSignalSpec[] = [
  {
    label: 'RespFlow',
    channel: 'flow',
    unit: 'l/min',
    physicalMin: -300,
    physicalMax: 300,
    digitalMin: -32768,
    digitalMax: 32767,
    hz: 25,
    bytesPerSample: 2,
  },
  {
    label: 'Pressure',
    channel: 'maskPressure',
    unit: 'hPa',
    physicalMin: 0,
    physicalMax: 25.5,
    digitalMin: 0,
    digitalMax: 255,
    hz: 5,
    bytesPerSample: 1,
  },
  {
    label: 'LeakFlowBreath',
    channel: 'leak',
    unit: 'l/min',
    physicalMin: 0,
    physicalMax: 127,
    digitalMin: -128,
    digitalMax: 127,
    hz: 1,
    bytesPerSample: 1,
  },
  {
    label: 'IPAP',
    channel: 'therapyPressure',
    unit: 'hPa',
    physicalMin: 0,
    physicalMax: 30,
    digitalMin: -32768,
    digitalMax: 32767,
    hz: 1,
    bytesPerSample: 2,
  },
  {
    label: 'EPAP',
    channel: 'expiratoryPressure',
    unit: 'hPa',
    physicalMin: 0,
    physicalMax: 25.5,
    digitalMin: 0,
    digitalMax: 255,
    hz: 1,
    bytesPerSample: 1,
  },
]

/** The device scores these; everything else the night model plants has no Prisma id at all. */
const EVENT_IDS: Partial<Record<PapEventType, number>> = {
  obstructiveApnea: 101,
  centralApnea: 102,
  apnea: 106,
  hypopnea: 111,
  rera: 121,
  periodicBreathing: 181,
}

const PRISMA_PARAMETERS = {
  mode: 6,
  pressure: 9,
  pressureMax: 10,
  pSoftMin: 11,
  pSoft: 12,
  softPap: 13,
  apapDynamic: 15,
  humidLevel: 16,
  autoStart: 17,
  softStartTimeMax: 18,
  softStartTime: 19,
  tubeType: 21,
  pMaxOa: 38,
} as const

const MODE_APAP = 2
const SOFT_PAP_STANDARD = 2

function inDeviceUnit(spec: PrismaSignalSpec, value: number): number {
  return /hPa/i.test(spec.unit) ? value * HPA_PER_CM_H2O : value
}

function digital(value: number, spec: PrismaSignalSpec): number {
  const span = spec.physicalMax - spec.physicalMin
  const digitalSpan = spec.digitalMax - spec.digitalMin
  const raw = spec.digitalMin + ((value - spec.physicalMin) / span) * digitalSpan

  return Math.max(spec.digitalMin, Math.min(spec.digitalMax, Math.round(raw)))
}

function signalFile(night: SyntheticNight, session: SyntheticSession): ArrayBuffer {
  const recordCount = Math.max(1, Math.round(session.durationMs / 1000 / RECORD_SECONDS))
  const at = deviceTimeAt(session.startMs)

  const signals: EdfSignalSpec[] = SIGNALS.map((spec) => ({
    label: spec.label,
    unit: spec.unit,
    physicalMin: spec.physicalMin,
    physicalMax: spec.physicalMax,
    digitalMin: spec.digitalMin,
    digitalMax: spec.digitalMax,
    samplesPerRecord: spec.hz * RECORD_SECONDS,
    reserved: spec.bytesPerSample === 1 ? EIGHT_BIT : SIXTEEN_BIT,
    bytesPerSample: spec.bytesPerSample,
  }))

  const records = Array.from({ length: recordCount }, (_, record) =>
    SIGNALS.map((spec) => {
      const samples = spec.hz * RECORD_SECONDS
      return Array.from({ length: samples }, (_, index) => {
        const atMs = session.startMs + record * RECORD_SECONDS * 1000 + (index / spec.hz) * 1000
        return digital(inDeviceUnit(spec, night.sample(spec.channel, atMs)), spec)
      })
    }),
  )

  return buildEdf({
    startDate: format(at, 'dd.MM.yy'),
    startTime: format(at, 'HH.mm.ss'),
    // The device writes its own count here, unlike ResMed, but the reader still derives it from size.
    declaredRecordCount: String(recordCount),
    recordDuration: RECORD_SECONDS,
    signals,
    records,
  })
}

function parameters(night: SyntheticNight): string[] {
  const { settings } = night
  const hundredths = (value: number | null) => (value === null ? null : Math.round(value * 100))

  const values: [number, number | null][] = [
    [PRISMA_PARAMETERS.mode, MODE_APAP],
    [PRISMA_PARAMETERS.pressure, hundredths(settings.minPressure)],
    [PRISMA_PARAMETERS.pressureMax, hundredths(settings.maxPressure)],
    [PRISMA_PARAMETERS.pSoft, hundredths(settings.startPressure)],
    [PRISMA_PARAMETERS.softPap, SOFT_PAP_STANDARD],
    [PRISMA_PARAMETERS.autoStart, settings.smartStart === 'On' ? 1 : 0],
    [PRISMA_PARAMETERS.softStartTime, settings.rampMinutes],
    [PRISMA_PARAMETERS.humidLevel, settings.humidifierLevel],
    [PRISMA_PARAMETERS.tubeType, 220],
  ]

  return values
    .filter(([, value]) => value !== null)
    .map(([id, value]) => `  <DeviceEvent DeviceEventID="0" ParameterID="${id}" NewValue="${value}"/>`)
}

function respEvent(event: PapEvent, sessionStartMs: number): string | null {
  const id = EVENT_IDS[event.type]
  if (id === undefined) return null

  // The device flags an event once it has ended, so what it writes is the end and the duration runs
  // back from it. Writing the start here instead would hide exactly the bug the loader has to avoid.
  const endTime = Math.round((event.startMs + event.durationMs - sessionStartMs) / DECISECOND_MS)
  const duration = Math.round(event.durationMs / DECISECOND_MS)

  return `  <RespEvent RespEventID="${id}" EndTime="${endTime}" Duration="${duration}" Pressure="900" Strength="0"/>`
}

function eventFile(night: SyntheticNight, session: SyntheticSession): ArrayBuffer {
  const sessionEndMs = session.startMs + session.durationMs
  const scored = night.events
    .filter((event) => event.startMs >= session.startMs && event.startMs < sessionEndMs)
    .map((event) => respEvent(event, session.startMs))
    .filter((line): line is string => line !== null)

  const body = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<PrismaEvents>',
    ...parameters(night),
    ...scored,
    '</PrismaEvents>',
    '',
  ]

  return new TextEncoder().encode(body.join('\n')).buffer as ArrayBuffer
}

export interface SyntheticPrismaCardOptions {
  seed: string
  dates: string[]
  waveforms?: boolean
}

/**
 * A Prisma Smart card, written by the same physiology the ResMed fixture uses. The day directory is an
 * opaque counter rather than a date, because the real naming is unknown and nothing may depend on it:
 * a reader that guesses the day from the folder passes against a date-shaped fixture and fails on a
 * real card.
 */
export function writeSyntheticPrismaCard(options: SyntheticPrismaCardOptions): PapFile[] {
  const nights = planNights(options.seed, options.dates[options.dates.length - 1], options.dates.length)
  const config = {
    devid: DEVICE_ID,
    dev: { sn: SERIAL, hwversion: HARDWARE_VERSION },
  }

  const files: PapFile[] = [
    { path: 'config.pscfg', data: new TextEncoder().encode(JSON.stringify(config, null, 2)).buffer as ArrayBuffer },
  ]

  if (options.waveforms === false) return files

  nights.forEach((night, nightIndex) => {
    const dayDir = String(nightIndex + 1).padStart(4, '0')

    night.sessions.forEach((session, sessionIndex) => {
      // Ids restart inside each day directory, which is why a reader may not key sessions on the id
      // alone: two nights would then collapse into one.
      const id = String(sessionIndex + 1).padStart(6, '0')

      files.push({ path: `${MACHINE_DIR}/${dayDir}/signal_${id}.wmedf`, data: signalFile(night, session) })
      files.push({ path: `${MACHINE_DIR}/${dayDir}/event_${id}.xml`, data: eventFile(night, session) })
    })
  })

  return files
}
