import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RouteLoadingIndicator } from './route-loading-indicator'

describe('route loading feedback', () => {
  it('shows a text-free themed progress line at the top of the page while pending', () => {
    const markup = renderToStaticMarkup(<RouteLoadingIndicator progress={0.5} />)

    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('top-0')
    expect(markup).toContain('h-px')
    expect(markup).toContain('bg-signal-flow')
    expect(markup).toContain('w-full')
    expect(markup).toContain('origin-left')
    expect(markup).toContain('transform:scaleX(0.5)')
    expect(markup).not.toContain('animate-route-loading')
    expect(markup).not.toContain('Loading')
  })

  it('includes the progress line in the initial page response', () => {
    const markup = renderToStaticMarkup(<RouteLoadingIndicator initial />)

    expect(markup).toContain('data-slot="route-loading-indicator"')
    expect(markup).toContain('transform:scaleX(0)')
  })

  it('renders nothing when navigation is idle', () => {
    expect(renderToStaticMarkup(<RouteLoadingIndicator />)).toBe('')
  })
})
