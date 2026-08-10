import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const LOGO_MARK_PATH = 'M4 13.2c1.9 0 2.1-4.4 3.7-4.4s1.8 6.4 3.4 6.4 1.8-8.4 3.4-8.4 1.6 6.4 3.2 6.4'

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-5', className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d={LOGO_MARK_PATH} />
    </svg>
  )
}

export function Wordmark({ className, markClassName }: { className?: string; markClassName?: string }) {
  const t = useTranslations('Metadata')

  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Logo className={cn('text-primary', markClassName)} />
      <span className="text-sm font-semibold tracking-tight">{t('appName')}</span>
      <Badge variant="outline" className="font-normal text-muted-foreground">
        {t('beta')}
      </Badge>
    </span>
  )
}
