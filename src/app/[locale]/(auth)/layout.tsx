import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <main className="flex flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
