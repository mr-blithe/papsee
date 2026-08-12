export const AIRSENSE_11_MIN_MODEL = 39000

const OFF_ON = ['Off', 'On']
const OFF_ON_AUTO = ['Off', 'On', 'Auto']
const EPR_MODES = ['Off', 'Ramp Only', 'Full Time']

const UNKNOWN_MODE = 16

const MODE_LABELS: Record<number, string> = {
  0: 'CPAP',
  1: 'AutoSet',
  2: 'Bilevel Fixed',
  3: 'Bilevel Fixed',
  4: 'Bilevel S/T',
  5: 'Bilevel S/T',
  6: 'Bilevel Auto',
  7: 'ASV',
  8: 'ASV Auto EPAP',
  9: 'iVAPS',
  10: 'PAC',
  11: 'AutoSet for Her',
  [UNKNOWN_MODE]: 'Unknown',
}

const AIRSENSE_11_MODE_TO_LEGACY: Record<number, number> = {
  0: UNKNOWN_MODE,
  1: 1,
  2: 11,
  3: 0,
  4: 3,
  5: UNKNOWN_MODE,
  6: 7,
  7: 8,
  8: 6,
}

const UNKNOWN = 'Unknown'

function label(table: readonly string[], value: number | null): string {
  if (value === null) return UNKNOWN
  return table[value] ?? `Unknown (${value})`
}

export interface EnumDecoder {
  mode(raw: number): string
  onOff(raw: number | null): string
  onOffAuto(raw: number | null): string
  eprType(raw: number | null): string
  eprMode(raw: number | null): string
  rampMode(raw: number | null): string
  mask(raw: number | null): string
  climateControl(raw: number | null): string
  patientAccess(raw: number | null): string
  yesNo(raw: number | null): string
}

/**
 * Without a model number nothing can say which generation's tables apply, and the two disagree by one
 * on almost every setting. Reporting unknown is the only honest answer.
 */
const UNKNOWN_GENERATION: EnumDecoder = {
  mode: () => UNKNOWN,
  onOff: () => UNKNOWN,
  onOffAuto: () => UNKNOWN,
  eprType: () => UNKNOWN,
  eprMode: () => UNKNOWN,
  rampMode: () => UNKNOWN,
  mask: () => UNKNOWN,
  climateControl: () => UNKNOWN,
  patientAccess: () => UNKNOWN,
  yesNo: () => UNKNOWN,
}

export function enumDecoder(modelNumber: number | null): EnumDecoder {
  if (modelNumber === null) return UNKNOWN_GENERATION

  const isAirSense11 = modelNumber >= AIRSENSE_11_MIN_MODEL
  const shift = (raw: number | null) => (raw === null ? null : isAirSense11 ? raw - 1 : raw)

  return {
    mode(raw) {
      const legacy = isAirSense11 ? (AIRSENSE_11_MODE_TO_LEGACY[raw] ?? UNKNOWN_MODE) : raw
      return MODE_LABELS[legacy] ?? `Unknown (${raw})`
    },
    onOff: (raw) => label(OFF_ON, shift(raw)),
    onOffAuto: (raw) => label(OFF_ON_AUTO, shift(raw)),
    eprType: (raw) => label(EPR_MODES, raw === null ? null : isAirSense11 ? raw : raw + 1),
    // The S9 writes the relief mode itself rather than the dotted signal's offset encoding, so this
    // one takes the reading as it stands.
    eprMode: (raw) => label(EPR_MODES, raw),
    rampMode: (raw) => label(OFF_ON_AUTO, shift(raw)),
    mask(raw) {
      if (raw === null) return UNKNOWN
      if (!isAirSense11) return label(['Pillows', 'Full Face', 'Nasal', UNKNOWN], raw)
      return raw < 2 || raw > 4 ? UNKNOWN : label(['Pillows', 'Full Face', 'Nasal'], raw - 2)
    },
    climateControl: (raw) => label(['Auto', 'Manual'], shift(raw)),
    patientAccess: (raw) => label(isAirSense11 ? ['Advanced', 'Simple'] : ['Plus', 'On'], shift(raw)),
    yesNo: (raw) => label(['No', 'Yes'], shift(raw)),
  }
}

export function isAutoMode(mode: string): boolean {
  return mode === 'AutoSet' || mode === 'AutoSet for Her'
}
