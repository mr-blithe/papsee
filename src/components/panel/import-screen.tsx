'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FolderOpen, Loader2, TriangleAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { BRAND_NAMES, RECOGNISED_BRANDS, isSupported, type CardBrand } from '@/lib/pap'
import { loadBrowserFiles, type LoadProgress } from '@/lib/pap/sources'
import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Link, useRouter } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'
import { uploadCard, type CommitProgress, type UploadProgress } from '@/lib/therapy/client'
import { BRAND_COVERAGE, type DeviceGuideId } from '@/lib/therapy/device-guides'
import { PanelCard, PanelCardHeader } from './panel-card'

type ImportState =
  | { status: 'idle' }
  | { status: 'reading'; progress?: LoadProgress }
  | { status: 'uploading'; progress?: UploadProgress }
  | { status: 'committing'; progress?: CommitProgress }
  | { status: 'unsupported'; brand: CardBrand | null }
  | { status: 'failed'; key: ApiErrorMessageKey }
  | { status: 'done'; nights: number }

function CoverageRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 font-medium sm:w-64">{term}</dt>
      <dd className="min-w-0 text-muted-foreground">{detail}</dd>
    </div>
  )
}

export function ImportScreen({ device }: { device: DeviceGuideId | null }) {
  const t = useTranslations('Import')
  const actions = useTranslations('Actions')
  const errors = useTranslations('ApiErrors')
  const therapy = useTranslations('Therapy')
  const devices = useTranslations('Devices')
  const locale = useLocale()
  const router = useRouter()

  const [state, setState] = useState<ImportState>({ status: 'idle' })
  const [readBrand, setReadBrand] = useState<CardBrand | null>(null)
  const [heldBack, setHeldBack] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    input?.setAttribute('webkitdirectory', '')
    input?.setAttribute('directory', '')
  }, [])

  const guide = device ?? 'other'
  const busy = state.status === 'reading' || state.status === 'uploading' || state.status === 'committing'

  // Leaving mid import aborts the requests in flight, and the client answers that by deleting the
  // whole import. Both exits have to be held: the browser's own for a close or a reload, and the
  // router's for a link, which never reaches beforeunload because it never unloads the document.
  useEffect(() => {
    if (!busy) return

    const warnOnUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }

    const holdInAppLinks = (event: MouseEvent) => {
      const opensElsewhere = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      if (event.defaultPrevented || event.button !== 0 || opensElsewhere) return

      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return
      if (!link.getAttribute('href')?.startsWith('/')) return

      event.preventDefault()
      event.stopPropagation()
      setHeldBack(true)
    }

    window.addEventListener('beforeunload', warnOnUnload)
    document.addEventListener('click', holdInAppLinks, true)

    return () => {
      window.removeEventListener('beforeunload', warnOnUnload)
      document.removeEventListener('click', holdInAppLinks, true)
    }
  }, [busy])

  const handleFolder = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    setHeldBack(false)
    setState({ status: 'reading' })

    let card
    try {
      card = await loadBrowserFiles(fileList, (progress) => setState({ status: 'reading', progress }))
    } catch {
      setState({ status: 'failed', key: 'unknown' })
      return
    }

    if (!isSupported(card.brand)) {
      setState({ status: 'unsupported', brand: card.brand })
      return
    }

    // The notice below follows the card in front of the reader, not the device they picked in
    // onboarding, because those two disagree exactly when it matters.
    setReadBrand(card.brand)

    setState({ status: 'uploading' })
    const outcome = await uploadCard(
      card.files,
      (progress) => setState({ status: 'uploading', progress }),
      (progress) => setState({ status: 'committing', progress }),
    )

    if (outcome.status === 'failed') {
      setState({ status: 'failed', key: apiErrorKey(outcome.code) })
      return
    }

    trackEvent('import_completed', { nights: outcome.dates.length })
    setState({ status: 'done', nights: outcome.dates.length })
  }

  const phase = (): { label: string; value: number | null } | null => {
    const share = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : null)

    if (state.status === 'reading')
      return state.progress
        ? {
            label: t('readingProgress', { loaded: state.progress.loaded, total: state.progress.total }),
            value: share(state.progress.loaded, state.progress.total),
          }
        : { label: t('reading'), value: null }

    if (state.status === 'uploading')
      return state.progress
        ? {
            label: t('uploadingProgress', { sent: state.progress.sent, total: state.progress.total }),
            value: share(state.progress.sent, state.progress.total),
          }
        : { label: t('uploading'), value: null }

    if (state.status === 'committing')
      return state.progress
        ? {
            label: t('committingProgress', { committed: state.progress.committed, total: state.progress.total }),
            value: share(state.progress.committed, state.progress.total),
          }
        : { label: t('committing'), value: null }

    return null
  }

  const running = phase()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <PanelCard>
        <PanelCardHeader title={t('guideTitle')} description={devices(guide)} />
        <ol className="list-inside list-decimal space-y-2 px-5 py-4 text-sm text-muted-foreground marker:text-muted-foreground/70">
          <li>{t('stepPowerOff')}</li>
          <li>{t(`card_${guide}`)}</li>
          <li>{t('stepReader')}</li>
          <li>{t('stepChooseFolder')}</li>
        </ol>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{t('writeCaution')}</p>
      </PanelCard>

      <PanelCard className="px-5 py-6 text-center">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFolder(event.target.files)
            event.target.value = ''
          }}
        />

        {state.status === 'idle' || state.status === 'unsupported' || state.status === 'failed' ? (
          <>
            <FolderOpen className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-base font-semibold tracking-tight">{t('pickTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('pickBody')}</p>
            <Button className="mt-5" onClick={() => inputRef.current?.click()}>
              <FolderOpen aria-hidden />
              {actions('chooseFolder')}
            </Button>
          </>
        ) : null}

        {running ? (
          <div className="space-y-3 text-left">
            <Progress value={running.value} locale={locale} className="gap-x-3 gap-y-2">
              <ProgressLabel className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                {running.label}
              </ProgressLabel>
              <ProgressValue />
            </Progress>

            <p className="text-xs text-muted-foreground">{t('stayCaution')}</p>

            {heldBack ? (
              <p role="alert" className="flex items-start gap-2 text-xs text-destructive">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t('heldBack')}
              </p>
            ) : null}
          </div>
        ) : null}

        {state.status === 'done' ? (
          <>
            <CheckCircle2 className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-base font-semibold tracking-tight">{t('doneTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('doneBody', { nights: state.nights })}</p>
            <Button className="mt-5" onClick={() => router.push('/panel/therapy')}>
              {actions('openTherapy')}
            </Button>
          </>
        ) : null}
      </PanelCard>

      {state.status === 'unsupported' ? (
        <PanelCard className="flex items-start gap-3 px-5 py-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{therapy('unsupportedTitle')}</p>
            <p className="mt-0.5 text-muted-foreground">
              {state.brand
                ? therapy('unsupportedBrand', { brand: BRAND_NAMES[state.brand] })
                : therapy('unsupportedUnknown')}
            </p>
          </div>
        </PanelCard>
      ) : null}

      {readBrand && BRAND_COVERAGE[readBrand] === 'read' ? (
        <PanelCard className="flex items-start gap-3 px-5 py-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 text-muted-foreground">{t('unverifiedBrand', { brand: BRAND_NAMES[readBrand] })}</p>
        </PanelCard>
      ) : null}

      {state.status === 'failed' ? (
        <PanelCard className="flex items-start gap-3 px-5 py-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{t('failedTitle')}</p>
            <p className="mt-0.5 text-muted-foreground">{errors(state.key)}</p>
          </div>
        </PanelCard>
      ) : null}

      <PanelCard>
        <PanelCardHeader title={t('supportTitle')} description={t('supportDescription')} />
        <div className="space-y-3 px-5 py-4 text-sm">
          <p className="text-muted-foreground">{t('supportedDevices')}</p>
          <dl className="space-y-2">
            <CoverageRow term={t('coverageVerified')} detail={t('coverageVerifiedDevices')} />
            <CoverageRow term={t('coverageRead')} detail={t('coverageReadDevices')} />
            <CoverageRow
              term={t('coverageRecognised')}
              detail={RECOGNISED_BRANDS.map((brand) => BRAND_NAMES[brand]).join(', ')}
            />
          </dl>
        </div>
      </PanelCard>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/panel/onboarding" className="underline underline-offset-4 hover:text-foreground">
          {t('changeDevice')}
        </Link>
      </p>
    </div>
  )
}
