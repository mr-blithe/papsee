import { cache } from 'react'
import { and, desc, eq, lte } from 'drizzle-orm'
import type { Locale } from '@/i18n/routing'
import type { ContractType, PublishedContract } from '@/lib/contracts'
import { db } from '@/lib/db'
import { contract } from '@/lib/db/pap-schema'

export const getPublishedContract = cache(
  async (type: ContractType, locale: Locale, at = new Date()): Promise<PublishedContract | null> => {
    const [published] = await db
      .select({
        type: contract.type,
        locale: contract.locale,
        version: contract.version,
        title: contract.title,
        summary: contract.summary,
        contentHtml: contract.contentHtml,
        publishedAt: contract.publishedAt,
      })
      .from(contract)
      .where(and(eq(contract.type, type), eq(contract.locale, locale), lte(contract.publishedAt, at)))
      .orderBy(desc(contract.publishedAt), desc(contract.createdAt))
      .limit(1)

    return published ?? null
  },
)
