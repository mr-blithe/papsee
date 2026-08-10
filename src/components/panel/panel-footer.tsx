import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { SOURCE_URL } from '@/lib/site-url'
import { APP_VERSION } from '@/lib/version'

const LEGAL_LINKS = [
  { href: '/privacy', key: 'privacy' },
  { href: '/terms', key: 'terms' },
  { href: '/contact', key: 'contact' },
] as const

export function PanelFooter() {
  const landing = useTranslations('Landing')
  const legal = useTranslations('Legal')

  return (
    <footer className="mt-auto border-t border-border px-4 py-4 md:px-5">
      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {legal(`${link.key}Title`)}
            </Link>
          ))}
          {SOURCE_URL ? (
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
              {legal('sourceTitle')}
            </a>
          ) : null}
          <span>{legal('version', { version: APP_VERSION })}</span>
        </nav>
        <p className="max-w-xl leading-5 sm:text-right">{landing('disclaimer')}</p>
      </div>
    </footer>
  )
}
