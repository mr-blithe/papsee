import type { ReactNode } from 'react'

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
