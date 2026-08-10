export interface XmlElement {
  name: string
  attributes: Record<string, string>
}

const NAME_START = /[A-Za-z_]/
const NAME_PART = /[A-Za-z0-9_.:-]/
const WHITESPACE = /\s/

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

function decodeEntities(value: string): string {
  if (!value.includes('&')) return value

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    return NAMED_ENTITIES[body] ?? whole
  })
}

/**
 * Every element and its attributes, from a flat document of self-closing tags. This is deliberately not
 * an XML parser: the input is one shape, the parse layer has to run on the server where `DOMParser`
 * does not exist, and the whole `@/lib/pap` barrel is reachable from the browser bundle.
 *
 * It reads attribute values quote-aware rather than by regex, because a `>` is legal inside one and a
 * pattern that stops at the first `>` is wrong about the format even where it happens to work. Nesting,
 * text content and namespaces are not interpreted; a caller that needs them needs a real parser.
 */
export function readElements(source: string): XmlElement[] {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source
  const elements: XmlElement[] = []
  let at = 0

  const skipTo = (marker: string): void => {
    const found = text.indexOf(marker, at)
    at = found < 0 ? text.length : found + marker.length
  }

  while (at < text.length) {
    const open = text.indexOf('<', at)
    if (open < 0) break
    at = open + 1

    if (text.startsWith('!--', at)) {
      skipTo('-->')
      continue
    }
    if (text.startsWith('![CDATA[', at)) {
      skipTo(']]>')
      continue
    }
    if (text.startsWith('?', at) || text.startsWith('!', at) || text.startsWith('/', at)) {
      skipTo('>')
      continue
    }
    if (!NAME_START.test(text[at] ?? '')) continue

    let name = ''
    while (at < text.length && NAME_PART.test(text[at])) name += text[at++]

    const attributes: Record<string, string> = {}
    while (at < text.length) {
      while (at < text.length && WHITESPACE.test(text[at])) at += 1
      if (at >= text.length || text[at] === '>' || text[at] === '/') break
      if (!NAME_START.test(text[at])) {
        at += 1
        continue
      }

      let key = ''
      while (at < text.length && NAME_PART.test(text[at])) key += text[at++]

      while (at < text.length && WHITESPACE.test(text[at])) at += 1
      if (text[at] !== '=') continue
      at += 1
      while (at < text.length && WHITESPACE.test(text[at])) at += 1

      const quote = text[at]
      if (quote !== '"' && quote !== "'") continue
      at += 1

      const end = text.indexOf(quote, at)
      if (end < 0) {
        at = text.length
        break
      }
      attributes[key] = decodeEntities(text.slice(at, end))
      at = end + 1
    }

    skipTo('>')
    elements.push({ name, attributes })
  }

  return elements
}

/** An attribute read as a whole number, or null when it is absent or not one. Never defaulted to zero. */
export function readInteger(element: XmlElement, attribute: string): number | null {
  const raw = element.attributes[attribute]?.trim()
  // Number('') is zero, so an empty attribute would otherwise read as a confident reading of nothing.
  if (!raw) return null

  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}
