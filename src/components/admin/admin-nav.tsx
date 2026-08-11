'use client'

import { ArrowLeft, LayoutDashboard, ShieldBan, Users, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Wordmark } from '@/components/logo'
import { UserMenu } from '@/components/panel/user-menu'
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

const NAV_ITEMS = [
  { href: '/admin/overview', key: 'adminOverview', icon: LayoutDashboard },
  { href: '/admin/users', key: 'adminUsers', icon: Users },
  { href: '/admin/ip-bans', key: 'adminIpBans', icon: ShieldBan },
] as const

const NAV_BUTTON_CLASS_NAME =
  'h-11 rounded-lg px-3 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground data-active:font-medium md:h-9'

export function AdminSidebar() {
  const t = useTranslations('Nav')
  const metadata = useTranslations('Metadata')
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      mobileTitle={t('adminNavigation')}
      mobileDescription={t('adminNavigationDescription')}
    >
      <SidebarHeader className="h-14 flex-row items-center border-b border-sidebar-border px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/admin/overview"
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
        <SidebarGroup>
          <SidebarGroupLabel>{t('adminGroup')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
                const active = pathname === href

                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={href}
                          onClick={() => setOpenMobile(false)}
                          aria-current={active ? 'page' : undefined}
                        />
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
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/panel/overview" onClick={() => setOpenMobile(false)} />}
                  tooltip={t('backToPanel')}
                  className={NAV_BUTTON_CLASS_NAME}
                >
                  <ArrowLeft aria-hidden />
                  <span>{t('backToPanel')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail label={t('toggleMenu')} />
    </Sidebar>
  )
}

export function AdminTopBar({ name, email }: { name: string; email: string }) {
  const t = useTranslations('Nav')
  const { isMobile, open, openMobile } = useSidebar()
  const menuOpen = isMobile ? openMobile : open

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-4">
      <SidebarTrigger label={menuOpen ? t('closeMenu') : t('openMenu')} className="-ml-1 size-9 md:size-7" />

      <span className="md:hidden max-[420px]:[&_[data-slot=badge]]:hidden">
        <Wordmark className="text-sidebar-foreground" markClassName="text-sidebar-primary" />
      </span>

      <div className="ml-auto flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        {/* Already inside the admin area, so the menu does not offer a way back into it. */}
        <UserMenu name={name} email={email} view="account" isAdmin={false} />
      </div>
    </div>
  )
}
