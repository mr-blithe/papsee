import { useTranslations } from 'next-intl'
import { ScreenshotPreview } from './screenshot-preview'

const PREVIEW_WIDTH = 2532
const PREVIEW_HEIGHT = 1308
const PREVIEW_SOURCES = {
  light: '/images/therapy-detail-light.png',
  dark: '/images/therapy-detail.png',
}
const LOCALIZED_PREVIEW_SOURCES = {
  tr: {
    light: '/images/therapy-detail-tr-light.png',
    dark: '/images/therapy-detail-tr.png',
  },
}

export function SignalPreview() {
  const landing = useTranslations('Landing')

  return (
    <ScreenshotPreview
      sources={PREVIEW_SOURCES}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      label={landing('signalPreviewLabel')}
      sizes="(max-width: 1279px) calc(100vw - 2rem), 80rem"
      localizedSources={LOCALIZED_PREVIEW_SOURCES}
    />
  )
}
