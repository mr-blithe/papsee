import { cookies } from 'next/headers'
import { DemoBanner } from '@/components/panel/demo-banner'
import { PanelFooter } from '@/components/panel/panel-footer'
import { PanelSidebar, PanelTopBar } from '@/components/panel/panel-nav'
import { SIDEBAR_COOKIE_NAME, SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getPanelContext } from '@/lib/panel-context'
import { getSession } from '@/lib/session'
import { getProfile } from '@/lib/therapy/repository'

export default async function PanelLayout({ children }: LayoutProps<'/[locale]/panel'>) {
  const session = await getSession()
  const context = await getPanelContext()
  const onboarded = context?.userId ? (await getProfile(context.userId)) !== null : false
  const demo = context?.demo ?? false
  const sidebarOpen = (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== 'false'

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <PanelSidebar onboarded={onboarded} demo={demo} />
        <SidebarInset className="min-w-0 overflow-hidden">
          <PanelTopBar email={session?.user.email ?? null} onboarded={onboarded} demo={demo} />
          <DemoBanner signedIn={session !== null} demo={demo} />
          {children}
          <PanelFooter />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
