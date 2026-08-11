import { cookies } from 'next/headers'
import { getFormatter } from 'next-intl/server'
import { DemoBanner } from '@/components/panel/demo-banner'
import { ImpersonationBanner } from '@/components/panel/impersonation-banner'
import { PanelFooter } from '@/components/panel/panel-footer'
import { PanelSidebar, PanelTopBar } from '@/components/panel/panel-nav'
import { SharedBanner } from '@/components/panel/shared-banner'
import { SIDEBAR_COOKIE_NAME, SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isAdminRole } from '@/lib/admin/roles'
import { getPanelContext } from '@/lib/panel-context'
import { getSession } from '@/lib/session'
import { getProfile } from '@/lib/therapy/repository'

export default async function PanelLayout({ children }: LayoutProps<'/[locale]/panel'>) {
  const session = await getSession()
  const context = await getPanelContext()
  // Only an account is ever sent to onboarding or import, so no other view has a reason to read a
  // profile row here, and a shared view must not read the owner's at all.
  const onboarded = context?.view === 'account' ? (await getProfile(context.userId)) !== null : false
  const view = context?.view ?? null
  const sidebarOpen = (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== 'false'

  // Relative rather than absolute, because next-intl is pinned to the device time zone so device
  // clocks read the way the machine wrote them, and an expiry is a real instant in the reader's own.
  const endsIn = context?.view === 'shared' ? (await getFormatter()).relativeTime(context.expiresAt, new Date()) : null

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <PanelSidebar onboarded={onboarded} view={view} />
        <SidebarInset className="min-w-0 overflow-hidden">
          <PanelTopBar
            name={session?.user.name ?? ''}
            email={session?.user.email ?? null}
            onboarded={onboarded}
            view={view}
            isAdmin={isAdminRole(session?.user.role)}
          />
          <DemoBanner signedIn={session !== null} demo={view === 'demo'} />
          {endsIn ? <SharedBanner endsIn={endsIn} signedIn={session !== null} /> : null}
          <ImpersonationBanner
            impersonating={session?.session.impersonatedBy != null}
            email={session?.user.email ?? ''}
          />
          {children}
          <PanelFooter />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
