import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import en from '@/../messages/en.json'

// Rendering to a string has no app router mounted, and the banner reads one so its stop button can
// navigate. Neither it nor the auth client is exercised by these assertions.
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/auth-client', () => ({ admin: { stopImpersonating: vi.fn() } }))

const { ImpersonationBanner } = await import('./impersonation-banner')

function render(impersonating: boolean, email: string): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ImpersonationBanner impersonating={impersonating} email={email} />
    </NextIntlClientProvider>,
  )
}

describe('ImpersonationBanner', () => {
  // Impersonation is the one path from the admin panel to somebody's therapy data. A silent one is
  // the whole thing the confirm step and this banner exist to prevent.
  it('warns while an admin is reading somebody else', () => {
    const markup = render(true, 'reader@example.com')

    expect(markup).toContain(en.Impersonation.stop)
    expect(markup).not.toBe('')
  })

  // A warning that does not say whose account it is leaves the admin unable to tell what they are
  // looking at, which is how the wrong row gets read for a whole session.
  it('names the account being read', () => {
    expect(render(true, 'reader@example.com')).toContain('reader@example.com')
  })

  it('renders nothing at all for an ordinary reader', () => {
    expect(render(false, 'reader@example.com')).toBe('')
  })
})
