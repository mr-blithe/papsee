import type { PublishedContract } from '@/lib/contracts'
import { sanitizeContractHtml } from '@/lib/contracts'
import { SitePageShell } from './site-page-shell'

export function LegalPage({ contract }: { contract: PublishedContract }) {
  const contentHtml = sanitizeContractHtml(contract.contentHtml)

  return (
    <SitePageShell>
      <article className="w-full">
        <header className="border-b border-border pb-8">
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{contract.title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{contract.summary}</p>
        </header>

        <div
          className="py-8 text-sm leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4 [&_a:hover]:decoration-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2:first-child]:mt-0 [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:my-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </SitePageShell>
  )
}
