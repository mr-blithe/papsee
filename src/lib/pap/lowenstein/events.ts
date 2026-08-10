import { readElements, readInteger, type XmlElement } from './xml'
import type { DaySettings, PapEvent, PapEventType } from '../types'

const DECISECOND_MS = 100
const UNKNOWN = 'Unknown'

const PARAMETER = {
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

const MODE_CPAP = 1
const MODE_APAP = 2

const SOFT_PAP_NAMES: Record<number, string> = { 0: 'Off', 1: 'Slight', 2: 'Standard' }

/**
 * What the device scores and what PapSee can represent. Snore (131) and flow limitation (151) are
 * dropped on purpose: PapSee models both as continuous channels, which ResMed writes and Prisma does
 * not, and reporting one phenomenon as a channel on one brand and a marker on another would make the
 * two panels incomparable. Artifact, critical leak, timed breath, the epoch classes and deep sleep have
 * no counterpart in the shared shape at all.
 */
const EVENT_TYPES: Record<number, PapEventType> = {
  101: 'obstructiveApnea',
  102: 'centralApnea',
  103: 'apnea',
  105: 'apnea',
  106: 'apnea',
  111: 'hypopnea',
  112: 'hypopnea',
  121: 'rera',
  181: 'periodicBreathing',
}

export interface PrismaSession {
  parameters: Map<number, number>
  events: PapEvent[]
}

/**
 * One session's event file. Times are relative to the session start, so the caller anchors them; every
 * reading is either present and whole or absent, never defaulted.
 */
export function parsePrismaEvents(text: string, sessionStartMs: number): PrismaSession {
  const parameters = new Map<number, number>()
  const events: PapEvent[] = []

  for (const element of readElements(text)) {
    if (element.name === 'DeviceEvent') {
      readParameter(element, parameters)
      continue
    }
    if (element.name !== 'RespEvent') continue

    const event = readEvent(element, sessionStartMs)
    if (event) events.push(event)
  }

  events.sort((a, b) => a.startMs - b.startMs)

  return { parameters, events }
}

function readParameter(element: XmlElement, into: Map<number, number>): void {
  if (readInteger(element, 'DeviceEventID') !== 0) return

  const id = readInteger(element, 'ParameterID')
  const value = readInteger(element, 'NewValue')
  if (id === null || value === null) return

  into.set(id, value)
}

function readEvent(element: XmlElement, sessionStartMs: number): PapEvent | null {
  const id = readInteger(element, 'RespEventID')
  if (id === null) return null

  const type = EVENT_TYPES[id]
  if (!type) return null

  const endTime = readInteger(element, 'EndTime')
  const duration = readInteger(element, 'Duration')
  if (endTime === null || duration === null) return null

  const durationMs = duration * DECISECOND_MS
  // The device flags an event once it has ended, so what it wrote is the end and the duration runs back
  // from it. Taking the flag as the start would put every apnea one duration late and change no index.
  const endMs = sessionStartMs + endTime * DECISECOND_MS

  return { type, startMs: Math.max(sessionStartMs, endMs - durationMs), durationMs }
}

function hundredths(parameters: Map<number, number>, id: number): number | null {
  const value = parameters.get(id)
  return value === undefined ? null : value / 100
}

/** The settings a session reports, with `'Unknown'` wherever this device writes no such thing. */
export function toDaySettings(parameters: Map<number, number>): DaySettings {
  const mode = parameters.get(PARAMETER.mode)
  const isAuto = mode === MODE_APAP
  const softPap = parameters.get(PARAMETER.softPap)
  const rampMinutes = parameters.get(PARAMETER.softStartTime) ?? null

  return {
    mode: mode === MODE_CPAP ? 'CPAP' : isAuto ? 'APAP' : UNKNOWN,
    // Parameter 9 is the one pressure in CPAP and the floor of the range in APAP. OSCAR always files it
    // as the minimum, which reads wrong in fixed CPAP, so this branches on the mode instead.
    setPressure: mode === MODE_CPAP ? hundredths(parameters, PARAMETER.pressure) : null,
    minPressure: isAuto ? hundredths(parameters, PARAMETER.pressure) : null,
    maxPressure: isAuto ? hundredths(parameters, PARAMETER.pressureMax) : null,
    startPressure: hundredths(parameters, PARAMETER.pSoft),
    eprEnabled: softPap === undefined ? UNKNOWN : softPap === 0 ? 'Off' : 'On',
    eprType: softPap === undefined ? UNKNOWN : (SOFT_PAP_NAMES[softPap] ?? UNKNOWN),
    // softPAP is a comfort level, not a number of cmH2O, so there is nothing honest to put here.
    eprLevel: null,
    rampMode: rampMinutes === null ? UNKNOWN : rampMinutes === 0 ? 'Off' : 'On',
    rampMinutes,
    smartStart: switchName(parameters.get(PARAMETER.autoStart)),
    maskType: UNKNOWN,
    antibacterialFilter: UNKNOWN,
    humidifierEnabled: UNKNOWN,
    // Parameter 16 is read but never trusted: OSCAR leaves its own assignment commented out, so the
    // scale is unverified even in the reference implementation and a wrong level is a silent lie.
    humidifierLevel: null,
    climateControl: UNKNOWN,
    heatedTube: UNKNOWN,
    tubeTemperature: null,
    patientAccess: UNKNOWN,
  }
}

function switchName(value: number | undefined): string {
  if (value === undefined) return UNKNOWN
  return value === 0 ? 'Off' : 'On'
}
