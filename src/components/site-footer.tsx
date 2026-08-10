import { useTranslations } from 'next-intl'
import { Wordmark } from '@/components/logo'
import { Link } from '@/i18n/navigation'
import { SOURCE_URL } from '@/lib/site-url'

const LEGAL_LINKS = [
  { href: '/privacy', key: 'privacy' },
  { href: '/terms', key: 'terms' },
  { href: '/contact', key: 'contact' },
] as const

export function SiteFooter() {
  const landing = useTranslations('Landing')
  const legal = useTranslations('Legal')

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Wordmark markClassName="text-signal-flow" />
          <p className="max-w-2xl text-xs leading-5 text-muted-foreground sm:ml-auto sm:text-right">
            {landing('disclaimer')}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
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
        </nav>
      </div>
    </footer>
  )
}
