import { redirect } from 'next/navigation'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getPanelContext, type PanelContext } from '@/lib/panel-context'
import { countDays, getProfile } from './repository'

type PanelHref = '/sign-in' | '/share' | '/panel/onboarding' | '/panel/import' | '/panel/overview'

// next-intl's own redirect is a destructured binding, so TypeScript does not narrow on its `never`
// return. Routing through getPathname keeps the locale prefix and still narrows.
function leave(href: PanelHref, locale: Locale): never {
  redirect(getPathname({ href, locale }))
}

export async function requirePanelContext(locale: Locale): Promise<PanelContext> {
  const context = await getPanelContext()
  if (!context) leave('/sign-in', locale)

  return context
}

export async function requireAccount(locale: Locale): Promise<string> {
  const context = await requirePanelContext(locale)
  if (context.view !== 'account') leave('/panel/overview', locale)

  return context.userId
}

export async function requireOnboarded(locale: Locale): Promise<string> {
  const userId = await requireAccount(locale)
  if (!(await getProfile(userId))) leave('/panel/onboarding', locale)

  return userId
}

export async function requireStoredDays(locale: Locale): Promise<PanelContext> {
  const context = await requirePanelContext(locale)
  if (context.view === 'demo') return context

  // A link to an account with nothing in it would put a reader in front of the import screen, which
  // is not theirs to use, so it is turned away as a link that opens nothing.
  if (context.view === 'shared') {
    if ((await countDays(context.userId)) === 0) leave('/share', locale)

    return context
  }

  if (!(await getProfile(context.userId))) leave('/panel/onboarding', locale)
  if ((await countDays(context.userId)) === 0) leave('/panel/import', locale)

  return context
}
