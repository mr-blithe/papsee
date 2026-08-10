export type CardBrand =
  | 'resmed'
  | 'philips'
  | 'fisherPaykel'
  | 'lowensteinPrisma'
  | 'lowenstein'
  | 'devilbiss'
  | 'resvent'
  | 'bmc'
  | 'vrem'
  | 'yuwell'

const SUPPORTED_BRANDS: readonly CardBrand[] = ['resmed']

export const BRAND_NAMES: Record<CardBrand, string> = {
  resmed: 'ResMed',
  philips: 'Philips Respironics',
  fisherPaykel: 'Fisher & Paykel',
  lowensteinPrisma: 'Löwenstein Prisma',
  lowenstein: 'Löwenstein',
  devilbiss: 'DeVilbiss',
  resvent: 'Resvent',
  bmc: 'BMC',
  vrem: 'vREM',
  yuwell: 'Yuwell',
}

interface BrandSignature {
  brand: CardBrand
  matches(paths: string[]): boolean
}

function segments(path: string): string[] {
  return path.toLowerCase().split('/')
}

function basename(path: string): string {
  return segments(path).pop() ?? ''
}

function folder(path: string): string {
  return segments(path).slice(0, -1).join('/')
}

function hasSegment(paths: string[], segment: string): boolean {
  return paths.some((path) => segments(path).includes(segment))
}

function hasFile(paths: string[], name: string): boolean {
  return paths.some((path) => basename(path) === name)
}

function hasExtension(paths: string[], extension: string): boolean {
  return paths.some((path) => path.toLowerCase().endsWith(extension))
}

function hasFileIn(paths: string[], directory: string, name: string): boolean {
  return paths.some((path) => folder(path) === directory && basename(path) === name)
}

function hasSiblings(paths: string[], required: string[]): boolean {
  const owned = new Set(paths.map((path) => path.toLowerCase()))
  const stem = (path: string, extension: string) => path.toLowerCase().slice(0, -extension.length)

  return paths.some((path) => {
    const head = basename(path)
    const extension = required.find((candidate) => head.endsWith(candidate))
    if (!extension) return false

    return required.every((candidate) => owned.has(`${stem(path, extension)}${candidate}`))
  })
}

/**
 * OSCAR calls a folder a vREM card when its name starts with VREM and it holds both text files.
 * The folder name alone is too common to trust on its own.
 */
function isVrem(paths: string[]): boolean {
  const folders = new Set(paths.filter((path) => path.includes('/')).map(folder))

  return [...folders].some(
    (directory) =>
      (directory.split('/').pop() ?? '').startsWith('vrem') &&
      hasFileIn(paths, directory, 'pi.txt') &&
      hasFileIn(paths, directory, 'di.txt'),
  )
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
  {
    brand: 'philips',
    matches: (paths) =>
      hasSegment(paths, 'p-series') ||
      paths.some((path) => /^prop\d*\.txt$/.test(basename(path))) ||
      hasFile(paths, 'prop.bin'),
  },
  { brand: 'fisherPaykel', matches: (paths) => hasSegment(paths, 'fphcare') },
  { brand: 'lowensteinPrisma', matches: (paths) => hasFile(paths, 'config.pscfg') },
  {
    brand: 'lowenstein',
    matches: (paths) => hasFile(paths, 'config.pcfg') || hasFile(paths, 'wm_data.tdf'),
  },
  {
    brand: 'devilbiss',
    matches: (paths) => paths.some((path) => /(^|\/)sl\/set1$/i.test(path) || /(^|\/)dv6\/set\.bin$/i.test(path)),
  },
  {
    brand: 'resvent',
    matches: (paths) => hasSegment(paths, 'therapy') && hasSegment(paths, 'config') && hasSegment(paths, 'record'),
  },
  {
    brand: 'bmc',
    matches: (paths) => hasSiblings(paths, ['.usr', '.idx', '.000']) || hasSiblings(paths, ['.idx', '.000']),
  },
  { brand: 'vrem', matches: isVrem },
  { brand: 'yuwell', matches: (paths) => hasExtension(paths, '.bys') },
]

export function detectCard(paths: string[]): CardBrand | null {
  return SIGNATURES.find((signature) => signature.matches(paths))?.brand ?? null
}

export function isSupported(brand: CardBrand | null): boolean {
  return brand !== null && SUPPORTED_BRANDS.includes(brand)
}

/**
 * Brands PapSee names on a card but cannot read yet. Derived from the signature table so a brand added
 * there reaches the copy that lists them without a second edit.
 */
export const RECOGNISED_BRANDS: readonly CardBrand[] = SIGNATURES.map((signature) => signature.brand).filter(
  (brand) => !isSupported(brand),
)
