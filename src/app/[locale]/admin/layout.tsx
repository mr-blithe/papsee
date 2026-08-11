import { cookies } from 'next/headers'
import { AdminSidebar, AdminTopBar } from '@/components/admin/admin-nav'
import { SIDEBAR_COOKIE_NAME, SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getSession } from '@/lib/session'

export default async function AdminLayout({ children }: LayoutProps<'/[locale]/admin'>) {
  // Read to display, never to guard: a layout does not re-render on navigation and does not stop a
  // nested segment rendering, so requireAdmin lives in every page instead.
  const session = await getSession()
  const sidebarOpen = (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== 'false'

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AdminSidebar />
        <SidebarInset className="min-w-0 overflow-hidden">
          <AdminTopBar name={session?.user.name ?? ''} email={session?.user.email ?? ''} />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
