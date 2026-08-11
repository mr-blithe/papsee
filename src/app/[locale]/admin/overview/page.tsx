import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { PanelSection } from '@/components/panel/panel-card'
import { Tile } from '@/components/panel/summary-tiles'
import type { Locale } from '@/i18n/routing'
import { requireAdmin } from '@/lib/admin/access'
import { countBannedIps, readTotals } from '@/lib/admin/repository'

export async function generateMetadata(props: PageProps<'/[locale]/admin/overview'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Admin' })

  return { title: t('title') }
}

export default async function AdminOverviewPage({ params }: PageProps<'/[locale]/admin/overview'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  await requireAdmin(locale as Locale)

  const [t, totals, blockedAddresses] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: 'Admin' }),
    readTotals(),
    countBannedIps(),
  ])

  const accounts = [
    { key: 'totalUsers', value: totals.users },
    { key: 'verifiedUsers', value: totals.verified },
    { key: 'bannedUsers', value: totals.banned },
    { key: 'admins', value: totals.admins },
  ] as const

  const data = [
    { key: 'usersWithData', value: totals.usersWithData },
    { key: 'totalImports', value: totals.imports },
    { key: 'totalNights', value: totals.nights },
    { key: 'blockedAddresses', value: blockedAddresses },
  ] as const

  return (
    <div className="flex-1 space-y-3 p-4 md:p-5">
      <div className="px-0.5">
        <h1 className="text-base font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('description')}</p>
      </div>

      <PanelSection title={t('accountsTitle')}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {accounts.map((tile) => (
            <Tile key={tile.key} label={t(tile.key)} value={tile.value} />
          ))}
        </div>
      </PanelSection>

      <PanelSection title={t('dataTitle')} description={t('privacyNote')}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.map((tile) => (
            <Tile key={tile.key} label={t(tile.key)} value={tile.value} />
          ))}
        </div>
      </PanelSection>
    </div>
  )
}
