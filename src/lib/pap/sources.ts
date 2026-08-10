import { isImportable } from './files'
import type { PapFile } from './types'

export interface LoadProgress {
  loaded: number
  total: number
}

export interface PickedCard {
  files: PapFile[]
  paths: string[]
}

export async function loadBrowserFiles(
  fileList: FileList,
  onProgress?: (progress: LoadProgress) => void,
): Promise<PickedCard> {
  const picked = Array.from(fileList).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }))

  const readable = picked.filter((entry) => isImportable(entry.path))
  const files: PapFile[] = []
  let loaded = 0

  for (const entry of readable) {
    files.push({ path: entry.path, data: await entry.file.arrayBuffer() })
    loaded += 1
    onProgress?.({ loaded, total: readable.length })
  }

  return { files, paths: picked.map((entry) => entry.path) }
}
