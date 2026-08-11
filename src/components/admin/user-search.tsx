'use client'

import { Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePathname, useRouter } from '@/i18n/navigation'

export function UserSearch({ search }: { search: string }) {
  const t = useTranslations('AdminUsers')
  const router = useRouter()
  const pathname = usePathname()

  const submit = (formData: FormData) => {
    const value = String(formData.get('q') ?? '').trim()
    router.push(value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname)
  }

  return (
    <form action={submit} className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          defaultValue={search}
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          className="pl-8"
        />
      </div>
      <Button type="submit" variant="outline" size="sm">
        {t('search')}
      </Button>
      {search ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X aria-hidden />
          {t('clear')}
        </Button>
      ) : null}
    </form>
  )
}
