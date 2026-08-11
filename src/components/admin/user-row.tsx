'use client'

import type { ReactNode } from 'react'
import { useRouter } from '@/i18n/navigation'

/**
 * Mouse convenience only. The email cell holds a real link, which is what keyboard and screen
 * reader users follow and what a middle click or a right click needs, so this adds a shortcut
 * rather than becoming the only way in.
 */
export function UserRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter()

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={(event) => {
        // A click that landed on the actions menu, a link or a button belongs to that control.
        if ((event.target as HTMLElement).closest('a, button, [role="menuitem"]')) return

        router.push(href)
      }}
    >
      {children}
    </tr>
  )
}
