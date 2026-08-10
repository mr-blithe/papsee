export type CardBrand = 'resmed' | 'philips' | 'fisherPaykel' | 'lowenstein' | 'devilbiss' | 'resvent' | 'bmc'

const SUPPORTED_BRANDS: readonly CardBrand[] = ['resmed']

export const BRAND_NAMES: Record<CardBrand, string> = {
  resmed: 'ResMed',
  philips: 'Philips Respironics',
  fisherPaykel: 'Fisher & Paykel',
  lowenstein: 'Löwenstein',
  devilbiss: 'DeVilbiss',
  resvent: 'Resvent',
  bmc: 'BMC',
}

interface BrandSignature {
  brand: CardBrand
  matches(paths: string[]): boolean
}

function hasSegment(paths: string[], segment: string): boolean {
  return paths.some((path) => path.toLowerCase().split('/').includes(segment))
}

function hasFile(paths: string[], name: string): boolean {
  return paths.some((path) => path.toLowerCase().split('/').pop() === name)
}

function hasExtension(paths: string[], extension: string): boolean {
  return paths.some((path) => path.toLowerCase().endsWith(extension))
}

const SIGNATURES: BrandSignature[] = [
  {
    brand: 'resmed',
    matches: (paths) =>
      hasSegment(paths, 'datalog') ||
      paths.some((path) => /(^|\/)str[^/]*\.edf$/i.test(path)) ||
      hasFile(paths, 'identification.json') ||
      hasFile(paths, 'identification.tgt'),
  },
  { brand: 'philips', matches: (paths) => hasSegment(paths, 'p-series') || hasFile(paths, 'prop.txt') },
  { brand: 'fisherPaykel', matches: (paths) => hasSegment(paths, 'fphcare') },
  {
    brand: 'lowenstein',
    matches: (paths) =>
      hasFile(paths, 'config.pscfg') || hasFile(paths, 'config.pcfg') || hasFile(paths, 'wm_data.tdf'),
  },
  { brand: 'devilbiss', matches: (paths) => hasFile(paths, 'set1') || hasFile(paths, 'set.bin') },
  { brand: 'resvent', matches: (paths) => hasSegment(paths, 'therapy') },
  { brand: 'bmc', matches: (paths) => hasExtension(paths, '.usr') },
]

export function detectCard(paths: string[]): CardBrand | null {
  return SIGNATURES.find((signature) => signature.matches(paths))?.brand ?? null
}

export function isSupported(brand: CardBrand | null): boolean {
  return brand !== null && SUPPORTED_BRANDS.includes(brand)
}
