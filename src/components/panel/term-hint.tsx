'use client'

import { CircleQuestionMark } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import type { TermId } from '@/lib/terms'
import { cn } from '@/lib/utils'

export function TermHint({ term, className }: { term: TermId; className?: string }) {
  const t = useTranslations('Terms')
  const actions = useTranslations('Actions')

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        aria-label={actions('explainTerm', { term: t(`${term}Title`) })}
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
          className,
        )}
      >
        <CircleQuestionMark className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72">
        <PopoverTitle>{t(`${term}Title`)}</PopoverTitle>
        <PopoverDescription>{t(`${term}Body`)}</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
