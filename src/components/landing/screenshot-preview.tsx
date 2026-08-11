'use client'

import { Maximize2, Minimize2 } from 'lucide-react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Locale } from '@/i18n/routing'

interface ScreenshotPreviewProps {
  src: string
  width: number
  height: number
  label: string
  sizes: string
  localizedSources?: Partial<Record<Locale, string>>
  preload?: boolean
}

export function ScreenshotPreview({
  src,
  width,
  height,
  label,
  sizes,
  localizedSources,
  preload = false,
}: ScreenshotPreviewProps) {
  const actions = useTranslations('Actions')
  const locale = useLocale()
  const activeSrc = localizedSources?.[locale as Locale] ?? src
  const triggerLabel = `${actions('fullscreen')}: ${label}`

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={triggerLabel}
            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-background p-1.5 text-left shadow-2xl shadow-foreground/10 outline-none transition duration-300 hover:-translate-y-1 hover:border-signal-flow/40 focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        }
      >
        <Image
          src={activeSrc}
          width={width}
          height={height}
          alt=""
          aria-hidden
          preload={preload}
          sizes={sizes}
          className="h-auto w-full rounded-xl"
        />
        <span
          data-slot="fullscreen-indicator"
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-lg border border-white/15 bg-black/65 text-white opacity-0 shadow-lg backdrop-blur-sm transition group-hover:bg-black/80 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          <Maximize2 className="size-4" aria-hidden />
        </span>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:max-w-none"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
          <DialogTitle className="truncate text-sm font-semibold tracking-tight">{label}</DialogTitle>
          <DialogClose render={<Button variant="outline" size="sm" aria-label={actions('exitFullscreen')} />}>
            <Minimize2 aria-hidden />
            <span className="hidden sm:inline">{actions('exitFullscreen')}</span>
          </DialogClose>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-2 sm:p-4">
          <Image
            src={activeSrc}
            width={width}
            height={height}
            alt={label}
            sizes="100vw"
            className="h-auto max-h-full w-auto max-w-full rounded-md object-contain shadow-2xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
