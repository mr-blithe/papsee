import { describe, expect, it } from 'vitest'
import { CONTRACT_SEEDS } from './contract-seeds'
import { sanitizeContractHtml } from './contracts'

describe('contract seeds', () => {
  it('publishes every legal document in every supported locale', () => {
    expect(CONTRACT_SEEDS.map(({ type, locale }) => `${type}:${locale}`).sort()).toEqual([
      'privacy:en',
      'privacy:tr',
      'terms:en',
      'terms:tr',
    ])

    for (const seed of CONTRACT_SEEDS) {
      expect(seed.title.trim()).not.toBe('')
      expect(seed.summary.trim()).not.toBe('')
      expect(seed.contentHtml).toContain('<h2>')
      expect(seed.contentHtml).not.toContain(String.fromCharCode(8212))
    }
  })

  it('keeps the English privacy policy jurisdiction-neutral outside the GDPR', () => {
    const privacy = CONTRACT_SEEDS.find(({ type, locale }) => type === 'privacy' && locale === 'en')

    expect(privacy).toBeDefined()
    expect(privacy!.contentHtml).not.toMatch(/\bKVKK\b|Turkish|Turkey|Türkiye/)
  })

  it('chooses no governing law in either language of the terms', () => {
    const terms = CONTRACT_SEEDS.filter(({ type }) => type === 'terms')

    expect(terms).toHaveLength(2)

    for (const seed of terms) {
      expect(seed.contentHtml).not.toMatch(/\bKVKK\b|Turkish|Turkey|Türkiye/)
      expect(seed.contentHtml).not.toMatch(/governed by the laws|hukuku uygulanır/)
    }
  })
})

describe('contract HTML', () => {
  it('keeps the small set of document markup legal pages need', () => {
    const html = sanitizeContractHtml(`
      <h2>Rights</h2>
      <p>You may <strong>request deletion</strong>.</p>
      <ul><li><a href="/contact">Contact us</a></li></ul>
    `)

    expect(html).toContain('<h2>Rights</h2>')
    expect(html).toContain('<strong>request deletion</strong>')
    expect(html).toContain('<a href="/contact">Contact us</a>')
  })

  it('removes executable markup, event handlers, styles and unsafe URLs from stored content', () => {
    const html = sanitizeContractHtml(`
      <script>alert('script')</script>
      <xmp><img src=x onerror=alert('xmp')></xmp>
      <p style="position:fixed" onclick="alert('event')">Safe text</p>
      <a href="javascript:alert('url')">Unsafe link</a>
    `)

    expect(html).not.toContain('script')
    expect(html).not.toContain('xmp')
    expect(html).not.toContain('img')
    expect(html).not.toContain('style')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('<p>Safe text</p>')
    expect(html).toContain('<a>Unsafe link</a>')
  })

  it('adds isolation attributes to external links without changing same-site links', () => {
    const html = sanitizeContractHtml(`
      <a href="https://www.kvkk.gov.tr/">KVKK</a>
      <a href="/contact">Contact</a>
    `)

    expect(html).toContain('<a href="https://www.kvkk.gov.tr/" target="_blank" rel="noopener noreferrer">KVKK</a>')
    expect(html).toContain('<a href="/contact">Contact</a>')
  })
})
