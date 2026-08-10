import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { cn } from '@/lib/utils'

export function SitePageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8', className)}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
