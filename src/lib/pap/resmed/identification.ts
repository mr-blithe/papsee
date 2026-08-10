import type { DeviceInfo } from '../types'

interface IdentificationDocument {
  FlowGenerator?: {
    IdentificationProfiles?: {
      Product?: Record<string, string>
      Hardware?: Record<string, string>
      Software?: Record<string, string | number>
    }
  }
}

export function parseIdentification(json: string): DeviceInfo | null {
  let document: IdentificationDocument
  try {
    document = JSON.parse(json) as IdentificationDocument
  } catch {
    return null
  }

  const profiles = document.FlowGenerator?.IdentificationProfiles
  const product = profiles?.Product
  if (!product) return null

  const regions = product.ProductGeographicIdentifier?.split(',').filter(Boolean) ?? []

  return {
    serialNumber: product.SerialNumber ?? '',
    productCode: product.ProductCode ?? '',
    productName: product.ProductName ?? '',
    modelNumber: Number.parseInt(product.ProductCode ?? '', 10) || 0,
    regions,
    hardwareIdentifier: profiles?.Hardware?.HardwareIdentifier ?? '',
    applicationIdentifier: String(profiles?.Software?.ApplicationIdentifier ?? ''),
    bootloaderIdentifier: String(profiles?.Software?.BootloaderIdentifier ?? ''),
    dataVersion: String(profiles?.Software?.DataModelVersionIdentifier ?? ''),
  }
}

export function parseIdentificationTgt(text: string): DeviceInfo | null {
  const fields = new Map<string, string>()

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf(' ')
    if (separator < 0) continue
    fields.set(trimmed.slice(1, separator), trimmed.slice(separator + 1).trim())
  }

  const productCode = fields.get('PCD') ?? ''
  const productName = fields.get('PNA')?.replace(/_/g, ' ') ?? ''
  if (!productCode && !productName) return null

  return {
    serialNumber: fields.get('SRN') ?? '',
    productCode,
    productName,
    modelNumber: Number.parseInt(productCode, 10) || 0,
    regions: [],
    hardwareIdentifier: '',
    applicationIdentifier: '',
    bootloaderIdentifier: '',
    dataVersion: '',
  }
}

export function formatProductName(name: string): string {
  return name.replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2')
}
