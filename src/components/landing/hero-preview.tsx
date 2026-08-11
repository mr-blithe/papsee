import { useTranslations } from 'next-intl'
import { ScreenshotPreview } from './screenshot-preview'

const PREVIEW_WIDTH = 1336
const PREVIEW_HEIGHT = 1197
const PREVIEW_SRC = '/images/example-overview-content.png'
const LOCALIZED_PREVIEW_SOURCES = { tr: '/images/example-overview-content-tr.png' }

export function HeroPreview() {
  const landing = useTranslations('Landing')

  return (
    <ScreenshotPreview
      src={PREVIEW_SRC}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      label={landing('previewLabel')}
      sizes="(max-width: 1023px) calc(100vw - 2rem), 54rem"
      localizedSources={LOCALIZED_PREVIEW_SOURCES}
      preload
    />
  )
}
