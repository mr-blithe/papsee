import type { CaptureResult } from 'posthog-js'
import { describe, expect, it } from 'vitest'
import { analyticsEnabled, redactCapturedUrls } from './analytics'

const captured = (properties: Record<string, unknown>): CaptureResult =>
  ({ event: '$pageview', properties }) as unknown as CaptureResult

describe('analyticsEnabled', () => {
  it('stays off until the switch is turned on, whatever else is configured', () => {
    expect(analyticsEnabled(undefined, 'production')).toBe(false)
    expect(analyticsEnabled('', 'production')).toBe(false)
    expect(analyticsEnabled('false', 'production')).toBe(false)
  })

  it('reads only the exact word, so a near miss cannot switch reporting on by accident', () => {
    expect(analyticsEnabled('1', 'production')).toBe(false)
    expect(analyticsEnabled('yes', 'production')).toBe(false)
    expect(analyticsEnabled('TRUE', 'production')).toBe(false)
    expect(analyticsEnabled(' true ', 'production')).toBe(false)
  })

  it('never reports from a development session or a test run, switch on or not', () => {
    expect(analyticsEnabled('true', 'development')).toBe(false)
    expect(analyticsEnabled('true', 'test')).toBe(false)
    expect(analyticsEnabled('true', undefined)).toBe(false)
  })

  it('reports from a production build with the switch on', () => {
    expect(analyticsEnabled('true', 'production')).toBe(true)
  })
})

describe('redactCapturedUrls', () => {
  it('drops the therapy date a panel URL carries', () => {
    const result = redactCapturedUrls(
      captured({ $current_url: 'https://papsee.example/tr/panel/therapy?date=2026-08-09' }),
    )

    expect(result?.properties.$current_url).toBe('https://papsee.example/tr/panel/therapy')
  })

  it('drops a fragment as well as a query', () => {
    const result = redactCapturedUrls(captured({ $current_url: 'https://papsee.example/panel/therapy#2026-08-09' }))

    expect(result?.properties.$current_url).toBe('https://papsee.example/panel/therapy')
  })

  it('redacts every URL property PostHog derives from the address bar', () => {
    const result = redactCapturedUrls(
      captured({
        $current_url: 'https://papsee.example/panel/therapy?date=2026-08-09',
        $initial_current_url: 'https://papsee.example/panel/overview?date=2026-08-01',
        $session_entry_url: 'https://papsee.example/panel/therapy?date=2026-07-14',
      }),
    )

    expect(result?.properties).toMatchObject({
      $current_url: 'https://papsee.example/panel/therapy',
      $initial_current_url: 'https://papsee.example/panel/overview',
      $session_entry_url: 'https://papsee.example/panel/therapy',
    })
  })

  it('redacts the person property bags, which outlive the event they arrived on', () => {
    const result = redactCapturedUrls({
      event: '$pageview',
      properties: {},
      $set: { $current_url: 'https://papsee.example/panel/therapy?date=2026-08-09' },
      $set_once: { $initial_current_url: 'https://papsee.example/panel/therapy?date=2026-08-09' },
    } as unknown as CaptureResult)

    expect(result?.$set?.$current_url).toBe('https://papsee.example/panel/therapy')
    expect(result?.$set_once?.$initial_current_url).toBe('https://papsee.example/panel/therapy')
  })

  it('leaves properties that are not URLs alone', () => {
    const result = redactCapturedUrls(captured({ $current_url: 'not a url', nights: 47 }))

    expect(result?.properties.$current_url).toBe('not a url')
    expect(result?.properties.nights).toBe(47)
  })

  it('passes a dropped event through', () => {
    expect(redactCapturedUrls(null)).toBeNull()
  })
})
