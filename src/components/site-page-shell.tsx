import { SITE_CONTAINER } from '@/components/site-container'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { cn } from '@/lib/utils'

export function SitePageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className={cn(SITE_CONTAINER, 'flex-1 py-12 sm:py-16', className)}>{children}</main>
      <SiteFooter />
    </div>
  )
}
