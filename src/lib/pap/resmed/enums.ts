export const AIRSENSE_11_MIN_MODEL = 39000

const OFF_ON = ['Off', 'On']
const OFF_ON_AUTO = ['Off', 'On', 'Auto']

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

function label(table: readonly string[], value: number): string {
  return table[value] ?? `Unknown (${value})`
}

export interface EnumDecoder {
  mode(raw: number): string
  onOff(raw: number): string
  onOffAuto(raw: number): string
  eprType(raw: number): string
  rampMode(raw: number): string
  mask(raw: number): string
  climateControl(raw: number): string
  patientAccess(raw: number): string
  yesNo(raw: number): string
}

export function enumDecoder(modelNumber: number): EnumDecoder {
  const isAirSense11 = modelNumber >= AIRSENSE_11_MIN_MODEL
  const shift = (raw: number) => (isAirSense11 ? raw - 1 : raw)

  return {
    mode(raw) {
      const legacy = isAirSense11 ? (AIRSENSE_11_MODE_TO_LEGACY[raw] ?? UNKNOWN_MODE) : raw
      return MODE_LABELS[legacy] ?? `Unknown (${raw})`
    },
    onOff: (raw) => label(OFF_ON, shift(raw)),
    onOffAuto: (raw) => label(OFF_ON_AUTO, shift(raw)),
    eprType: (raw) => label(['Off', 'Ramp Only', 'Full Time'], isAirSense11 ? raw : raw + 1),
    rampMode: (raw) => label(OFF_ON_AUTO, shift(raw)),
    mask(raw) {
      if (!isAirSense11) return label(['Pillows', 'Full Face', 'Nasal', 'Unknown'], raw)
      return raw < 2 || raw > 4 ? 'Unknown' : label(['Pillows', 'Full Face', 'Nasal'], raw - 2)
    },
    climateControl: (raw) => label(['Auto', 'Manual'], shift(raw)),
    patientAccess: (raw) => label(isAirSense11 ? ['Advanced', 'Simple'] : ['Plus', 'On'], shift(raw)),
    yesNo: (raw) => label(['No', 'Yes'], shift(raw)),
  }
}

export function isAutoMode(mode: string): boolean {
  return mode === 'AutoSet' || mode === 'AutoSet for Her'
}
