import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requirePanelContext } from '@/lib/therapy/panel-access'

export default async function PanelPage({ params }: PageProps<'/[locale]/panel'>) {
  const { locale } = await params
  await requirePanelContext(locale as Locale)

  redirect({ href: '/panel/overview', locale })
}
