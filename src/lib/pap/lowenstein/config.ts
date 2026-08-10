import type { DeviceInfo } from '../types'

const UNKNOWN_MODEL = 'Unknown Model'

/**
 * The models OSCAR has been exercised against. An id outside this table still imports: naming it wrongly
 * would be worse than admitting the model is not known, and nothing in the parse depends on it.
 */
const MODEL_NAMES: Record<string, string> = {
  '0x92': 'Prisma Smart',
  '0x91': 'Prisma Soft',
}

interface PrismaConfig {
  devid?: unknown
  dev?: { sn?: unknown; hwversion?: unknown }
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * What `config.pscfg` says the device is. Three of `DeviceInfo`'s nine fields have a source here; the
 * rest stay empty rather than being filled with something that reads like a reading.
 */
export function parsePrismaConfig(text: string): DeviceInfo | null {
  let parsed: PrismaConfig
  try {
    parsed = JSON.parse(text) as PrismaConfig
  } catch {
    return null
  }

  const deviceId = asText(parsed.devid)

  return {
    serialNumber: asText(parsed.dev?.sn),
    productCode: deviceId,
    productName: MODEL_NAMES[deviceId] ?? UNKNOWN_MODEL,
    // Zero on purpose: this number selects ResMed's enum generation and means nothing here.
    modelNumber: 0,
    regions: [],
    hardwareIdentifier: asText(parsed.dev?.hwversion),
    applicationIdentifier: '',
    bootloaderIdentifier: '',
    dataVersion: '',
  }
}
