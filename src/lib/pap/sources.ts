import { detectCard, type CardBrand } from './detect'
import { loaderFor } from './loaders'
import type { PapFile } from './types'

export interface LoadProgress {
  loaded: number
  total: number
}

export interface PickedCard {
  brand: CardBrand | null
  files: PapFile[]
  paths: string[]
}

/**
 * The card the reader picked, read once. Detection runs on the whole path listing before a single byte
 * is loaded, so an unreadable card is named without pulling its proprietary records into browser
 * memory, and each brand decides for itself which of its files are worth uploading.
 */
export async function loadBrowserFiles(
  fileList: FileList,
  onProgress?: (progress: LoadProgress) => void,
): Promise<PickedCard> {
  const picked = Array.from(fileList).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }))

  const paths = picked.map((entry) => entry.path)
  const brand = detectCard(paths)
  const loader = loaderFor(brand)

  if (!loader) return { brand, files: [], paths }

  const readable = picked.filter((entry) => loader.isImportable(entry.path))
  const files: PapFile[] = []
  let loaded = 0

  for (const entry of readable) {
    files.push({ path: entry.path, data: await entry.file.arrayBuffer() })
    loaded += 1
    onProgress?.({ loaded, total: readable.length })
  }

  return { brand, files, paths }
}
