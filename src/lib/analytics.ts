import posthog, { type CaptureResult } from 'posthog-js'

const ANALYTICS_ON = 'true'

// The kill switch. It is off unless `NEXT_PUBLIC_POSTHOG_ENABLED` is exactly `true`, and a
// development session or a test run never reports whatever it is set to, so nothing a maintainer
// does locally can land in the same project as real usage.
export function analyticsEnabled(flag: string | undefined, nodeEnv: string | undefined): boolean {
  return flag === ANALYTICS_ON && nodeEnv === 'production'
}

const URL_PROPERTIES = ['$current_url', '$initial_current_url', '$session_entry_url'] as const

// A panel URL carries the night being read, as in /panel/therapy?date=2026-08-09, and that a person
// used a PAP device on a given date is the therapy data itself. $initial_current_url is also set
// once on the person profile, so it outlives the event it arrived on and has to be redacted here too.
const withoutQueryOrFragment = (value: unknown): unknown => {
  if (typeof value !== 'string') return value

  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return value
  }
}

export function redactCapturedUrls(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result

  for (const bag of [result.properties, result.$set, result.$set_once]) {
    if (!bag) continue

    for (const property of URL_PROPERTIES) {
      if (property in bag) bag[property] = withoutQueryOrFragment(bag[property])
    }
  }

  return result
}

type TrackedEvent = 'sign_up' | 'sign_in' | 'import_completed' | 'example_data_opened' | 'contact_message_sent'

// Every one of these fires immediately before a navigation, and the Google button leaves the origin
// entirely, so none of them can wait for the batch queue to flush. Calling capture on an instance
// that was never initialised only logs, so the switch above is what silences a call site, not a
// second copy of the rule here.
export function trackEvent(event: TrackedEvent, properties?: Record<string, string | number>): void {
  if (!posthog.__loaded) return
  posthog.capture(event, properties, { send_instantly: true })
}
