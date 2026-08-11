import { useTranslations } from 'next-intl'
import { ScreenshotPreview } from './screenshot-preview'

const PREVIEW_WIDTH = 1336
const PREVIEW_HEIGHT = 1197
const PREVIEW_SOURCES = {
  light: '/images/example-overview-content-light.png',
  dark: '/images/example-overview-content.png',
}
const LOCALIZED_PREVIEW_SOURCES = {
  tr: {
    light: '/images/example-overview-content-tr-light.png',
    dark: '/images/example-overview-content-tr.png',
  },
}

export function HeroPreview() {
  const landing = useTranslations('Landing')

  return (
    <ScreenshotPreview
      sources={PREVIEW_SOURCES}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      label={landing('previewLabel')}
      sizes="(max-width: 1023px) calc(100vw - 2rem), 44rem"
      localizedSources={LOCALIZED_PREVIEW_SOURCES}
      highPriority
    />
  )
}
