import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireAdmin } from '@/lib/admin/access'

export default async function AdminPage({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params
  await requireAdmin(locale as Locale)

  redirect({ href: '/admin/overview', locale })
}
