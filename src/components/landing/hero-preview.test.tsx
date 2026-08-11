import { NextIntlClientProvider } from 'next-intl'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import en from '@/../messages/en.json'
import tr from '@/../messages/tr.json'
import { HeroPreview } from './hero-preview'
import { SignalPreview } from './signal-preview'

describe('landing hero preview', () => {
  it('opens the supplied therapy screenshot from one accessible trigger', () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <HeroPreview />
      </NextIntlClientProvider>,
    )

    expect(markup).toContain(`aria-label="${en.Actions.fullscreen}: ${en.Landing.previewLabel}"`)
    expect(markup).toContain('example-overview-content.png')
  })

  it('shows the supplied therapy screenshot in the signals preview', () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignalPreview />
      </NextIntlClientProvider>,
    )

    expect(markup).toContain(`aria-label="${en.Actions.fullscreen}: ${en.Landing.signalPreviewLabel}"`)
    expect(markup).toContain('therapy-detail.png')
  })

  it('uses Turkish screenshots for the Turkish landing page', () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="tr" messages={tr}>
        <HeroPreview />
        <SignalPreview />
      </NextIntlClientProvider>,
    )

    expect(markup).toContain('example-overview-content-tr.png')
    expect(markup).toContain('therapy-detail-tr.png')
  })

  it('keeps the English screenshots as the fallback for an unmatched locale', () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="de" messages={en}>
        <HeroPreview />
        <SignalPreview />
      </NextIntlClientProvider>,
    )

    expect(markup).toContain('example-overview-content.png')
    expect(markup).toContain('therapy-detail.png')
  })

  it('shows an icon-only full-screen affordance on interaction', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <HeroPreview />
      </NextIntlClientProvider>,
    )

    const indicator = container.querySelector('[data-slot="fullscreen-indicator"]')

    expect(indicator?.textContent).toBe('')
    expect(indicator?.classList).toContain('opacity-0')
    expect(indicator?.classList).toContain('group-hover:opacity-100')
  })

  it('does not retain copy for the removed trend section', () => {
    expect(en.Landing).not.toHaveProperty('trendTitle')
  })

  it('shows the full-screen image after the preview is clicked', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(
          <NextIntlClientProvider locale="en" messages={en}>
            <HeroPreview />
          </NextIntlClientProvider>,
        )
      })

      const trigger = document.querySelector<HTMLButtonElement>(`button[aria-label^="${en.Actions.fullscreen}"]`)

      expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()

      await act(async () => {
        trigger?.click()
      })

      expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
      expect(document.querySelector('[data-slot="dialog-close"]')?.getAttribute('aria-label')).toBe(
        en.Actions.exitFullscreen,
      )
      expect(document.body.textContent).toContain(en.Actions.exitFullscreen)
    } finally {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  })
})
