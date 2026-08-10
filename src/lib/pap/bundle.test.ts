import { describe, expect, it } from 'vitest'
import { decodePapBundle, encodePapBundle, encodePapBundleHeader, PapBundleError } from './bundle'
import { writeSyntheticCard } from './synthetic/card'
import type { PapFile } from './types'

function bytesOf(values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer
}

function concat(parts: Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }
  return joined
}

describe('pap bundle', () => {
  it('returns every card file with its bytes untouched', () => {
    const card = writeSyntheticCard({ seed: 'bundle', dates: ['2026-08-08'] })

    const decoded = decodePapBundle(encodePapBundle(card).buffer as ArrayBuffer)

    expect(decoded.map((file) => file.path)).toEqual(card.map((file) => file.path))
    for (const [index, file] of decoded.entries()) {
      expect(new Uint8Array(file.data), `bytes of ${file.path}`).toEqual(new Uint8Array(card[index].data))
    }
  })

  it('keeps a file that follows a zero length file at the right offset', () => {
    const files: PapFile[] = [
      { path: 'DATALOG/20260808/empty.edf', data: new ArrayBuffer(0) },
      { path: 'STR.edf', data: bytesOf([9, 8, 7]) },
    ]

    const decoded = decodePapBundle(encodePapBundle(files).buffer as ArrayBuffer)

    expect(decoded[0].data.byteLength).toBe(0)
    expect(new Uint8Array(decoded[1].data)).toEqual(new Uint8Array([9, 8, 7]))
  })

  it('measures a non-ASCII path in bytes, not characters', () => {
    const files: PapFile[] = [{ path: 'DATALOG/Sızıntı ölçümü.edf', data: bytesOf([1, 2]) }]

    const decoded = decodePapBundle(encodePapBundle(files).buffer as ArrayBuffer)

    expect(decoded[0].path).toBe('DATALOG/Sızıntı ölçümü.edf')
    expect(new Uint8Array(decoded[0].data)).toEqual(new Uint8Array([1, 2]))
  })

  it('streams the same bytes the buffered encoder writes', () => {
    const files: PapFile[] = [
      { path: 'Identification.json', data: bytesOf([1, 2, 3]) },
      { path: 'STR.edf', data: bytesOf([4, 5]) },
    ]

    const streamed = concat([
      encodePapBundleHeader(files.map((file) => ({ path: file.path, length: file.data.byteLength }))),
      ...files.map((file) => new Uint8Array(file.data)),
    ])

    expect(streamed).toEqual(encodePapBundle(files))
  })

  it('rejects a truncated payload instead of returning short files', () => {
    const bundle = encodePapBundle([{ path: 'STR.edf', data: bytesOf([1, 2, 3, 4]) }])

    expect(() => decodePapBundle(bundle.slice(0, bundle.length - 2).buffer as ArrayBuffer)).toThrow(PapBundleError)
  })

  it('rejects a body that is not a bundle at all', () => {
    const html = new TextEncoder().encode('<!doctype html><title>Gateway timeout</title>')

    expect(() => decodePapBundle(html.buffer as ArrayBuffer)).toThrow(PapBundleError)
  })
})
