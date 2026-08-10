import { ImageResponse } from 'next/og'
import { LOGO_MARK_PATH } from '@/components/logo'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const BACKGROUND = '#0a0a0a'
const STROKE = '#fafafa'
const MARK_SIZE = 116

export default function AppleIcon() {
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${STROKE}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.25"/><path d="${LOGO_MARK_PATH}"/></svg>`

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: BACKGROUND,
      }}
    >
      <img alt="" width={MARK_SIZE} height={MARK_SIZE} src={`data:image/svg+xml;utf8,${encodeURIComponent(mark)}`} />
    </div>,
    size,
  )
}
