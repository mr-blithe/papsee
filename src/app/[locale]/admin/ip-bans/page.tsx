import type { Metadata } from 'next'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { IpBanManager } from '@/components/admin/ip-ban-manager'
import type { Locale } from '@/i18n/routing'
import { requireAdmin } from '@/lib/admin/access'
import { listBannedIps } from '@/lib/admin/repository'

export async function generateMetadata(props: PageProps<'/[locale]/admin/ip-bans'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'AdminIpBans' })

  return { title: t('title') }
}

export default async function AdminIpBansPage({ params }: PageProps<'/[locale]/admin/ip-bans'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  await requireAdmin(locale as Locale)

  const [t, format, bans] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: 'AdminIpBans' }),
    getFormatter(),
    listBannedIps(),
  ])

  const now = new Date()

  return (
    <div className="flex-1 space-y-3 p-4 md:p-5">
      <div className="px-0.5">
        <h1 className="text-base font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('description')}</p>
      </div>

      <IpBanManager
        bans={bans.map((ban) => ({
          id: ban.id,
          ip: ban.ip,
          reason: ban.reason,
          bannedBy: ban.bannedBy,
          blockedAt: format.relativeTime(ban.createdAt, now),
        }))}
      />
    </div>
  )
}
