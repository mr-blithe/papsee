import type { ChannelId, PapEventType } from '../types'

interface ChannelMapping {
  id: ChannelId
  unit: string
  scale: number
  labels: string[]
}

const MAPPINGS: ChannelMapping[] = [
  { id: 'flow', unit: 'L/min', scale: 60, labels: ['Flow.40ms', 'Flow'] },
  { id: 'maskPressure', unit: 'cmH2O', scale: 1, labels: ['Press.40ms', 'MaskPress.2s', 'Mask Pres'] },
  { id: 'therapyPressure', unit: 'cmH2O', scale: 1, labels: ['Press.2s', 'Therapy Pres'] },
  { id: 'expiratoryPressure', unit: 'cmH2O', scale: 1, labels: ['EprPress.2s', 'EPRPress.2s', 'Exp Pres'] },
  {
    id: 'leak',
    unit: 'L/min',
    scale: 60,
    labels: ['Leak.2s', 'Leak', 'Leck', 'Fuites', 'Fuite', 'Fuga', 'Lekk', 'Läck', 'Sızıntı', '漏气'],
  },
  { id: 'respiratoryRate', unit: 'bpm', scale: 1, labels: ['RespRate.2s', 'RR', 'AF', 'FR'] },
  { id: 'tidalVolume', unit: 'mL', scale: 1000, labels: ['TidVol.2s', 'Vt', 'VC'] },
  { id: 'minuteVentilation', unit: 'L/min', scale: 1, labels: ['MinVent.2s', 'MV', 'VM'] },
  { id: 'snore', unit: '', scale: 1, labels: ['Snore.2s', 'Snore'] },
  { id: 'flowLimitation', unit: '', scale: 1, labels: ['FlowLim.2s', 'FFL Index'] },
  { id: 'pulse', unit: 'bpm', scale: 1, labels: ['Pulse.1s', 'Pulse', 'Puls', 'Pouls', 'Pols', 'Nabiz'] },
  { id: 'oxygenSaturation', unit: '%', scale: 1, labels: ['SpO2.1s', 'SpO2'] },
]

const EVENTS: { type: PapEventType; labels: string[] }[] = [
  { type: 'obstructiveApnea', labels: ['Obstructive apnea'] },
  { type: 'centralApnea', labels: ['Central apnea'] },
  { type: 'unclassifiedApnea', labels: ['Unclassified apnea'] },
  { type: 'hypopnea', labels: ['Hypopnea'] },
  { type: 'apnea', labels: ['Apnea'] },
  { type: 'rera', labels: ['Arousal', 'RERA'] },
  { type: 'periodicBreathing', labels: ['CSR Start'] },
]

const PERIODIC_BREATHING_END = ['CSR End']

const IGNORED_EVENT_LABELS = ['Recording starts', 'Recording ends', ...PERIODIC_BREATHING_END, 'SpO2 Desaturation']

function matchLength(labels: string[], label: string): number {
  let best = 0
  for (const candidate of labels) {
    if (candidate.length > best && label.toLowerCase().startsWith(candidate.toLowerCase())) best = candidate.length
  }
  return best
}

function bestMatch<T extends { labels: string[] }>(entries: T[], label: string): T | null {
  let winner: T | null = null
  let best = 0

  for (const entry of entries) {
    const length = matchLength(entry.labels, label)
    if (length > best) {
      best = length
      winner = entry
    }
  }

  return winner
}

export function lookupChannel(label: string): ChannelMapping | null {
  return bestMatch(MAPPINGS, label)
}

export function lookupEventType(label: string): PapEventType | null {
  if (matchLength(IGNORED_EVENT_LABELS, label) > 0) return null
  return bestMatch(EVENTS, label)?.type ?? null
}

export function isPeriodicBreathingEnd(label: string): boolean {
  return matchLength(PERIODIC_BREATHING_END, label) > 0
}

export const LARGE_LEAK_THRESHOLD = 24
