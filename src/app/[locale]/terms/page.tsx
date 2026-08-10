import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { LegalPage } from '@/components/legal-page'
import type { Locale } from '@/i18n/routing'
import { getPublishedContract } from '@/lib/contracts.server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/[locale]/terms'>): Promise<Metadata> {
  const { locale } = await props.params
  const contract = await getPublishedContract('terms', locale as Locale)

  return contract ? { title: contract.title, description: contract.summary } : {}
}

export default async function TermsPage({ params }: PageProps<'/[locale]/terms'>) {
  const { locale } = await params
  const activeLocale = locale as Locale
  setRequestLocale(activeLocale)
  const contract = await getPublishedContract('terms', activeLocale)
  if (!contract) notFound()

  return <LegalPage contract={contract} />
}
