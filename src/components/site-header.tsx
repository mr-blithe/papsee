import { SiGithub } from '@icons-pack/react-simple-icons'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Wordmark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { getSession } from '@/lib/session'
import { SOURCE_URL } from '@/lib/site-url'

export async function SiteHeader() {
  const landing = await getTranslations('Landing')
  const metadata = await getTranslations('Metadata')
  const session = await getSession()

  return (
    <header className="border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label={metadata('appName')}>
          <Wordmark markClassName="text-signal-flow" />
        </Link>
        <nav className="ml-10 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link className="transition-colors hover:text-foreground" href="/#why">
            {landing('navWhy')}
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/#how">
            {landing('navHow')}
          </Link>
        </nav>
        <div className="ml-auto -mr-2 flex items-center gap-1 lg:mr-[-6.25rem] xl:mr-[-8.25rem]">
          <Button
            variant="ghost"
            nativeButton={false}
            className="hidden sm:inline-flex"
            render={
              session ? <Link href="/panel">{landing('panel')}</Link> : <Link href="/sign-in">{landing('signIn')}</Link>
            }
          />
          {SOURCE_URL ? (
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={
                <a href={SOURCE_URL} target="_blank" rel="noreferrer" aria-label={landing('sourceLabel')}>
                  <SiGithub aria-hidden />
                </a>
              }
            />
          ) : null}
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
