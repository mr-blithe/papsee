'use client'

import { Activity, LayoutDashboard, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Wordmark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Link, usePathname } from '@/i18n/navigation'
import { useDemoMode } from './use-demo-mode'
import { UserMenu } from './user-menu'

const NAV_ITEMS = [
  { href: '/panel/overview', key: 'overview', icon: LayoutDashboard },
  { href: '/panel/therapy', key: 'therapy', icon: Activity },
] as const

const NAV_BUTTON_CLASS_NAME =
  'h-11 rounded-lg px-3 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground data-active:font-medium md:h-9'

function TherapyLinks() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('therapyGroup')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
            const active = pathname === href

            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  render={
                    <Link href={href} onClick={() => setOpenMobile(false)} aria-current={active ? 'page' : undefined} />
                  }
                  isActive={active}
                  tooltip={t(key)}
                  className={NAV_BUTTON_CLASS_NAME}
                >
                  <Icon aria-hidden />
                  <span>{t(key)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ImportLink() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const active = pathname === '/panel/import'

  return (
    <SidebarGroup className="pb-1">
      <SidebarGroupLabel>{t('actionsGroup')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link
                  href="/panel/import"
                  onClick={() => setOpenMobile(false)}
                  aria-current={active ? 'page' : undefined}
                />
              }
              isActive={active}
              tooltip={t('import')}
              className={NAV_BUTTON_CLASS_NAME}
            >
              <Upload aria-hidden />
              <span>{t('import')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function PanelSidebar({ onboarded, demo }: { onboarded: boolean; demo: boolean }) {
  const t = useTranslations('Nav')
  const inDemo = useDemoMode(demo)
  const canImport = onboarded && !inDemo
  const metadata = useTranslations('Metadata')
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      mobileTitle={t('navigation')}
      mobileDescription={t('navigationDescription')}
    >
      <SidebarHeader className="h-14 flex-row items-center border-b border-sidebar-border px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/panel/overview"
          aria-label={metadata('appName')}
          onClick={() => setOpenMobile(false)}
          className="min-w-0 rounded-lg px-2 py-1.5 outline-none ring-sidebar-ring focus-visible:ring-2 group-data-[collapsible=icon]:px-0"
        >
          <Wordmark
            className="min-w-0 overflow-hidden group-data-[collapsible=icon]:[&>span]:hidden"
            markClassName="text-sidebar-primary"
          />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-10 md:hidden"
          aria-label={t('closeMenu')}
          onClick={() => setOpenMobile(false)}
        >
          <X aria-hidden />
        </Button>
      </SidebarHeader>
      <SidebarContent className="px-1 py-2">
        {canImport ? <ImportLink /> : null}
        <TherapyLinks />
      </SidebarContent>
      <SidebarRail label={t('toggleMenu')} />
    </Sidebar>
  )
}

export function PanelTopBar({ email, onboarded, demo }: { email: string | null; onboarded: boolean; demo: boolean }) {
  const t = useTranslations('Nav')
  const inDemo = useDemoMode(demo)
  const canImport = onboarded && !inDemo
  const { isMobile, open, openMobile } = useSidebar()
  const menuOpen = isMobile ? openMobile : open

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-4">
      <SidebarTrigger label={menuOpen ? t('closeMenu') : t('openMenu')} className="-ml-1 size-9 md:size-7" />

      <span className="md:hidden max-[420px]:[&_[data-slot=badge]]:hidden">
        <Wordmark className="text-sidebar-foreground" markClassName="text-sidebar-primary" />
      </span>

      <div className="ml-auto flex items-center gap-1">
        {canImport ? (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/panel/import" />}
            className="mr-1 size-9 bg-[var(--accent-action)] px-0 text-[var(--accent-action-foreground)] hover:bg-[var(--accent-action)]/85 sm:h-7 sm:w-auto sm:px-2.5"
          >
            <Upload aria-hidden />
            <span className="hidden sm:inline">{t('import')}</span>
          </Button>
        ) : null}
        <LanguageSwitcher />
        <ThemeToggle />
        {email ? <UserMenu email={email} demo={inDemo} /> : null}
      </div>
    </div>
  )
}
