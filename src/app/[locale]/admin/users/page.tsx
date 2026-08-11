import type { Metadata } from 'next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { UserRow } from '@/components/admin/user-row'
import { UserRowActions } from '@/components/admin/user-row-actions'
import { UserSearch } from '@/components/admin/user-search'
import { PanelCard, PanelCardHeader } from '@/components/panel/panel-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireAdmin } from '@/lib/admin/access'
import { ADMIN_ROLE } from '@/lib/admin/roles'
import { listAdminUsers } from '@/lib/admin/repository'
import { pageCount, parsePage } from '@/lib/admin/pagination'

export async function generateMetadata(props: PageProps<'/[locale]/admin/users'>): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'AdminUsers' })

  return { title: t('title') }
}

export default async function AdminUsersPage({ params, searchParams }: PageProps<'/[locale]/admin/users'>) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const admin = await requireAdmin(locale as Locale)

  const query = await searchParams
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const page = parsePage(typeof query.page === 'string' ? query.page : null)

  const [t, format, { rows, total }] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: 'AdminUsers' }),
    getFormatter(),
    listAdminUsers(search, page),
  ])

  // Relative rather than absolute, and worded on the server: next-intl is pinned to the device time
  // zone, so an account timestamp needs either a zone of its own or no zone at all.
  const now = new Date()
  const pages = pageCount(total)
  const pageHref = (target: number) =>
    `/admin/users?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(target) })}`

  return (
    <div className="flex-1 space-y-3 p-4 md:p-5">
      <div className="px-0.5">
        <h1 className="text-base font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('description')}</p>
      </div>

      <UserSearch search={search} />

      <PanelCard>
        <PanelCardHeader title={t('title')} description={t('resultCount', { count: total })} />

        {rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">{search ? t('noResults') : t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">{t('email')}</th>
                  <th className="px-5 py-2 font-medium">{t('status')}</th>
                  <th className="px-5 py-2 text-right font-medium">{t('imports')}</th>
                  <th className="px-5 py-2 text-right font-medium">{t('nights')}</th>
                  <th className="px-5 py-2 font-medium">{t('lastUpload')}</th>
                  <th className="px-5 py-2 font-medium">{t('signedUp')}</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <UserRow key={row.id} href={`/admin/users/${row.id}`}>
                    <td className="px-5 py-2">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="font-medium break-all outline-none hover:underline focus-visible:underline"
                      >
                        {row.email}
                      </Link>
                      {row.name ? <span className="block text-xs text-muted-foreground">{row.name}</span> : null}
                    </td>
                    <td className="px-5 py-2">
                      <span className="flex flex-wrap gap-1">
                        {row.banned ? <Badge variant="destructive">{t('statusBanned')}</Badge> : null}
                        {!row.banned && !row.emailVerified ? (
                          <Badge variant="secondary">{t('statusUnverified')}</Badge>
                        ) : null}
                        {!row.banned && row.emailVerified ? <Badge variant="outline">{t('statusActive')}</Badge> : null}
                        {row.role === ADMIN_ROLE ? <Badge>{row.role}</Badge> : null}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums">{row.imports}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{row.nights}</td>
                    <td className="px-5 py-2 text-muted-foreground">
                      {row.lastUploadAt ? format.relativeTime(row.lastUploadAt, now) : t('never')}
                    </td>
                    <td className="px-5 py-2 text-muted-foreground">{format.relativeTime(row.createdAt, now)}</td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end">
                        <UserRowActions
                          userId={row.id}
                          email={row.email}
                          banned={row.banned}
                          isSelf={row.id === admin.userId}
                        />
                      </div>
                    </td>
                  </UserRow>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">{t('pageOf', { page, pages })}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                disabled={page <= 1}
                render={<Link href={pageHref(page - 1)} />}
              >
                <ChevronLeft aria-hidden />
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                disabled={page >= pages}
                render={<Link href={pageHref(page + 1)} />}
              >
                {t('next')}
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </PanelCard>
    </div>
  )
}
