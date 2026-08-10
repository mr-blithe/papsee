const MAGIC = 'PAPB'
const MAGIC_BYTES = 4
const HEADER_BYTES = MAGIC_BYTES + 4
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024

export interface PapBundleEntry {
  path: string
  offset: number
  length: number
}

/**
 * One slice of a card file. A file small enough to send whole is a single chunk at offset 0; a file
 * larger than one request is cut into several, and the server appends them in order.
 */
export interface PapFileChunk {
  path: string
  offset: number
  data: ArrayBuffer
}

export class PapBundleError extends Error {}

export function encodePapBundleHeader(entries: PapBundleEntry[]): Uint8Array {
  const manifest = new TextEncoder().encode(JSON.stringify(entries))
  const header = new Uint8Array(HEADER_BYTES + manifest.length)

  header.set(new TextEncoder().encode(MAGIC), 0)
  new DataView(header.buffer).setUint32(MAGIC_BYTES, manifest.length, true)
  header.set(manifest, HEADER_BYTES)

  return header
}

export function encodePapBundle(chunks: PapFileChunk[]): Uint8Array {
  const header = encodePapBundleHeader(
    chunks.map((chunk) => ({ path: chunk.path, offset: chunk.offset, length: chunk.data.byteLength })),
  )
  const payloadBytes = chunks.reduce((total, chunk) => total + chunk.data.byteLength, 0)
  const bundle = new Uint8Array(header.length + payloadBytes)

  bundle.set(header, 0)
  let cursor = header.length
  for (const chunk of chunks) {
    bundle.set(new Uint8Array(chunk.data), cursor)
    cursor += chunk.data.byteLength
  }

  return bundle
}

export function decodePapBundle(bundle: ArrayBuffer): PapFileChunk[] {
  if (bundle.byteLength < HEADER_BYTES) throw new PapBundleError('bundle is shorter than its header')

  const bytes = new Uint8Array(bundle)
  const decoder = new TextDecoder('utf-8', { fatal: true })

  if (decoder.decode(bytes.subarray(0, MAGIC_BYTES)) !== MAGIC) throw new PapBundleError('bundle magic does not match')

  const manifestBytes = new DataView(bundle).getUint32(MAGIC_BYTES, true)
  if (manifestBytes > MAX_MANIFEST_BYTES) throw new PapBundleError('bundle manifest is implausibly large')
  if (HEADER_BYTES + manifestBytes > bundle.byteLength) throw new PapBundleError('bundle manifest is truncated')

  const entries = parseManifest(decoder.decode(bytes.subarray(HEADER_BYTES, HEADER_BYTES + manifestBytes)))
  const payloadBytes = entries.reduce((total, entry) => total + entry.length, 0)
  if (HEADER_BYTES + manifestBytes + payloadBytes !== bundle.byteLength) {
    throw new PapBundleError('bundle payload length does not match its manifest')
  }

  const chunks: PapFileChunk[] = []
  let cursor = HEADER_BYTES + manifestBytes
  for (const entry of entries) {
    chunks.push({ path: entry.path, offset: entry.offset, data: bundle.slice(cursor, cursor + entry.length) })
    cursor += entry.length
  }

  return chunks
}

function parseManifest(text: string): PapBundleEntry[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new PapBundleError('bundle manifest is not valid JSON')
  }

  if (!Array.isArray(parsed)) throw new PapBundleError('bundle manifest is not a list')

  return parsed.map((entry) => {
    const candidate = entry as Partial<PapBundleEntry>
    if (typeof candidate.path !== 'string' || candidate.path.length === 0) {
      throw new PapBundleError('bundle manifest entry has no path')
    }
    if (!Number.isSafeInteger(candidate.length) || (candidate.length as number) < 0) {
      throw new PapBundleError('bundle manifest entry has no usable length')
    }
    if (!Number.isSafeInteger(candidate.offset) || (candidate.offset as number) < 0) {
      throw new PapBundleError('bundle manifest entry has no usable offset')
    }
    return { path: candidate.path, offset: candidate.offset as number, length: candidate.length as number }
  })
}
