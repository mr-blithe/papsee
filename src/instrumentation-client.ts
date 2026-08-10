import posthog from 'posthog-js'
import { analyticsEnabled, redactCapturedUrls } from '@/lib/analytics'

// Each of these has to be read as a literal `process.env.X` expression: Next.js inlines a
// NEXT_PUBLIC_ value by substituting the text at build time, so handing `process.env` to a helper
// would leave the caller reading nothing.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

if (token && analyticsEnabled(process.env.NEXT_PUBLIC_POSTHOG_ENABLED, process.env.NODE_ENV)) {
  posthog.init(token, {
    // api_host is our own subdomain in front of PostHog's managed proxy, so requests are
    // first-party and survive ad blockers. ui_host has to name the real app: it is where the
    // toolbar loads from, and the proxy does not serve it.
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
    // Dated defaults. This one sets capture_pageview to 'history_change', which is how the App
    // Router navigates. The next snapshot, '2026-06-25', would also switch on session-recording
    // network body capture, which must never be on here.
    defaults: '2026-05-30',
    // Not implied by that snapshot, and a fragment can carry the date of a night.
    disable_capture_url_hashes: true,
    // Autocapture sends the text of whatever was clicked. On the panel that text is a night's date,
    // an AHI, a pressure or a device name, which is the therapy data itself, so the only events
    // this project reports are the named ones in analytics.ts.
    autocapture: false,
    // A replay of the panel is a recording of someone's therapy history. This flag keeps that off
    // regardless of what the PostHog project is set to.
    disable_session_recording: true,
    before_send: redactCapturedUrls,
  })
}
