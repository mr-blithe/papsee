import sanitizeHtml from 'sanitize-html'
import type { Locale } from '@/i18n/routing'

export const CONTRACT_TYPES = ['privacy', 'terms'] as const

export type ContractType = (typeof CONTRACT_TYPES)[number]

export interface PublishedContract {
  type: ContractType
  locale: Locale
  version: string
  title: string
  summary: string
  contentHtml: string
  publishedAt: Date
}

const ALLOWED_TAGS = ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a']
const NON_TEXT_TAGS = ['script', 'style', 'textarea', 'option', 'xmp', 'iframe', 'object', 'noscript']

export function sanitizeContractHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    nonTextTags: NON_TEXT_TAGS,
    transformTags: {
      a: (tagName, attributes) => {
        const href = attributes.href
        const external = href?.startsWith('https://') || href?.startsWith('http://')
        const attribs: Record<string, string> = {}

        if (href) attribs.href = href
        if (external) {
          attribs.target = '_blank'
          attribs.rel = 'noopener noreferrer'
        }

        return {
          tagName,
          attribs,
        }
      },
    },
  })
}
