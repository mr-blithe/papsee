import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { LegalPage } from '@/components/legal-page'
import type { Locale } from '@/i18n/routing'
import { getPublishedContract } from '@/lib/contracts.server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const { locale } = await props.params
  const contract = await getPublishedContract('privacy', locale as Locale)

  return contract ? { title: contract.title, description: contract.summary } : {}
}

export default async function PrivacyPage({ params }: PageProps<'/[locale]/privacy'>) {
  const { locale } = await params
  const activeLocale = locale as Locale
  setRequestLocale(activeLocale)
  const contract = await getPublishedContract('privacy', activeLocale)
  if (!contract) notFound()

  return <LegalPage contract={contract} />
}
