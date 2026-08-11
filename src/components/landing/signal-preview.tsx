import { useTranslations } from 'next-intl'
import { ScreenshotPreview } from './screenshot-preview'

const PREVIEW_WIDTH = 2532
const PREVIEW_HEIGHT = 1308
const PREVIEW_SRC = '/images/therapy-detail.png'

export function SignalPreview() {
  const landing = useTranslations('Landing')

  return (
    <ScreenshotPreview
      src={PREVIEW_SRC}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      label={landing('signalPreviewLabel')}
      sizes="(max-width: 1279px) calc(100vw - 2rem), 80rem"
    />
  )
}
