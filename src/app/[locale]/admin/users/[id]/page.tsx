import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { AdminSessionTable } from '@/components/admin/session-table'
import { DeleteCard, SuspendCard, UserActions } from '@/components/admin/user-actions'
import { DataList, PanelCard, PanelCardHeader } from '@/components/panel/panel-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireAdmin } from '@/lib/admin/access'
import { ADMIN_ROLE } from '@/lib/admin/roles'
import { listUserSessions, readAdminUser } from '@/lib/admin/repository'
import { isDeviceGuideId } from '@/lib/therapy/device-guides'
import { getProfile } from '@/lib/therapy/repository'

// An operational log is read in UTC by convention. Deliberately not DEVICE_TIME_ZONE: that constant
// means "a device wall clock carries no zone", which is a different rule that happens to agree today.
const ADMIN_TIME_ZONE = 'UTC'

export async function generateMetadata(props: PageProps<'/[locale]/admin/users/[id]'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'AdminUsers' })

  return { title: t('accountTitle') }
}

export default async function AdminUserPage({ params }: PageProps<'/[locale]/admin/users/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale as Locale)

  const admin = await requireAdmin(locale as Locale)

  const account = await readAdminUser(id)
  if (!account) notFound()

  // getProfile is reused rather than reimplemented: its projection is already exactly the six
  // onboarding columns, so reusing it is what keeps a seventh from appearing here one day.
  const [t, format, profile, sessions] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: 'AdminUsers' }),
    getFormatter(),
    getProfile(id),
    listUserSessions(id),
  ])

  const now = new Date()
  const stamp = (value: Date) =>
    format.dateTime(value, { timeZone: ADMIN_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' })

  const accountItems = [
    { label: t('email'), value: account.email },
    { label: t('name'), value: account.name || t('notGiven') },
    { label: t('signedUp'), value: format.relativeTime(account.createdAt, now) },
    { label: t('verified'), value: account.emailVerified ? t('yes') : t('no') },
    { label: t('role'), value: account.role },
    ...(account.banned
      ? [
          { label: t('banReason'), value: account.banReason ?? t('notGiven') },
          {
            label: t('banExpires'),
            value: account.banExpires ? format.relativeTime(account.banExpires, now) : t('banNeverExpires'),
          },
        ]
      : []),
  ]

  const profileItems = profile
    ? [
        { label: t('bornOn'), value: profile.bornOn ?? t('notGiven') },
        { label: t('heightCm'), value: profile.heightCm ?? t('notGiven') },
        { label: t('weightKg'), value: profile.weightKg ?? t('notGiven') },
        { label: t('diagnosedOn'), value: profile.diagnosedOn ?? t('notGiven') },
        { label: t('diagnosisAhi'), value: profile.diagnosisAhi ?? t('notGiven') },
        { label: t('deviceGuide'), value: <DeviceName guide={profile.deviceGuide} locale={locale as Locale} /> },
      ]
    : []

  const dataItems = [
    { label: t('imports'), value: account.imports },
    { label: t('nights'), value: account.nights },
    {
      label: t('lastUpload'),
      value: account.lastUploadAt ? format.relativeTime(account.lastUploadAt, now) : t('never'),
    },
  ]

  return (
    <div className="flex-1 space-y-3 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight break-all">{account.email}</h1>
          <span className="mt-1 flex flex-wrap gap-1">
            {account.banned ? <Badge variant="destructive">{t('statusBanned')}</Badge> : null}
            {account.role === ADMIN_ROLE ? <Badge>{account.role}</Badge> : null}
          </span>
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/users" />}>
          <ArrowLeft aria-hidden />
          {t('backToList')}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <PanelCard>
          <PanelCardHeader title={t('accountTitle')} description={t('accountDescription')} />
          <div className="px-5 py-4">
            <DataList items={accountItems} wrap />
          </div>
        </PanelCard>

        <PanelCard>
          <PanelCardHeader title={t('profileTitle')} description={t('profileDescription')} />
          <div className="px-5 py-4">
            {profile ? (
              <DataList items={profileItems} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('noProfile')}</p>
            )}
          </div>
        </PanelCard>

        <PanelCard>
          <PanelCardHeader title={t('dataTitle')} description={t('dataDescription')} />
          <div className="px-5 py-4">
            <DataList items={dataItems} />
          </div>
        </PanelCard>
      </div>

      <AdminSessionTable
        sessions={sessions.map((row) => ({
          id: row.id,
          startedAt: stamp(row.createdAt),
          expiresAt: stamp(row.expiresAt),
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
          impersonated: row.impersonatedBy !== null,
        }))}
      />

      <UserActions
        userId={account.id}
        email={account.email}
        banned={account.banned}
        isSelf={account.id === admin.userId}
      />

      {account.id === admin.userId ? null : (
        <div className="grid gap-3 lg:grid-cols-2">
          <SuspendCard userId={account.id} banned={account.banned} />
          <DeleteCard userId={account.id} email={account.email} />
        </div>
      )}
    </div>
  )
}

async function DeviceName({ guide, locale }: { guide: string | null; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'AdminUsers' })
  if (!guide || !isDeviceGuideId(guide)) return t('notGiven')

  const devices = await getTranslations({ locale, namespace: 'Devices' })

  return devices(guide)
}
