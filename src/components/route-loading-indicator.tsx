'use client'

import { Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const MINIMUM_VISIBLE_MS = 400
const COMPLETION_VISIBLE_MS = 200
const LOADING_TIMEOUT_MS = 15_000
const PROGRESS_INTERVAL_MS = 120
const MAX_LOADING_PROGRESS = 0.92
const MINIMUM_PROGRESS_STEP = 0.015
const PROGRESS_APPROACH_RATE = 0.12
const IDLE_PROGRESS = -1

let routeProgress = IDLE_PROGRESS
let routeStartedAt = 0
let completionTimer: number | undefined
let progressTimer: number | undefined
let timeoutTimer: number | undefined
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function finishRouteLoading() {
  window.clearTimeout(completionTimer)
  window.clearTimeout(timeoutTimer)
  window.clearInterval(progressTimer)
  completionTimer = undefined
  progressTimer = undefined
  timeoutTimer = undefined
  if (routeProgress === IDLE_PROGRESS) return
  routeProgress = IDLE_PROGRESS
  emit()
}

function advanceRouteLoading() {
  const distance = MAX_LOADING_PROGRESS - routeProgress
  const step = Math.max(MINIMUM_PROGRESS_STEP, distance * PROGRESS_APPROACH_RATE)
  routeProgress = Math.min(MAX_LOADING_PROGRESS, routeProgress + step)
  emit()
}

function startRouteLoading() {
  window.clearTimeout(completionTimer)
  window.clearTimeout(timeoutTimer)
  window.clearInterval(progressTimer)
  completionTimer = undefined
  routeStartedAt = performance.now()
  routeProgress = 0
  emit()
  progressTimer = window.setInterval(advanceRouteLoading, PROGRESS_INTERVAL_MS)
  timeoutTimer = window.setTimeout(completeRouteLoading, LOADING_TIMEOUT_MS)
}

function completeRouteLoading() {
  if (routeProgress === IDLE_PROGRESS) return
  window.clearTimeout(completionTimer)
  window.clearTimeout(timeoutTimer)
  completionTimer = undefined
  timeoutTimer = undefined
  const remaining = Math.max(0, MINIMUM_VISIBLE_MS - (performance.now() - routeStartedAt))
  completionTimer = window.setTimeout(() => {
    window.clearInterval(progressTimer)
    progressTimer = undefined
    routeProgress = 1
    emit()
    completionTimer = window.setTimeout(finishRouteLoading, COMPLETION_VISIBLE_MS)
  }, remaining)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getRouteProgress() {
  return routeProgress
}

function getServerRouteProgress() {
  return IDLE_PROGRESS
}

function isRouteLinkClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return false

  const target = event.target
  const anchor = target instanceof Element ? target.closest('a') : null
  if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return false

  const currentUrl = new URL(window.location.href)
  const nextUrl = new URL(anchor.href, currentUrl)

  return (
    nextUrl.origin === currentUrl.origin &&
    (nextUrl.pathname !== currentUrl.pathname || nextUrl.search !== currentUrl.search)
  )
}

function NavigationCompletion() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (routeProgress === IDLE_PROGRESS) startRouteLoading()
    completeRouteLoading()
  }, [pathname, searchParams])

  return null
}

export function RouteLoadingIndicator({ progress, initial = false }: { progress?: number; initial?: boolean }) {
  const navigationProgress = useSyncExternalStore(subscribe, getRouteProgress, getServerRouteProgress)
  const [initialPending, setInitialPending] = useState(initial)

  useEffect(() => {
    if (!initial) return
    const timer = window.setTimeout(() => setInitialPending(false), MINIMUM_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [initial])

  const visibleProgress = progress ?? (navigationProgress === IDLE_PROGRESS && initialPending ? 0 : navigationProgress)
  if (visibleProgress === IDLE_PROGRESS) return null
  const clampedProgress = Math.min(1, Math.max(0, visibleProgress))

  return (
    <span
      aria-hidden
      data-slot="route-loading-indicator"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-px overflow-hidden bg-signal-flow/15"
    >
      <span
        className="block h-full w-full origin-left bg-signal-flow transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${clampedProgress})` }}
      />
    </span>
  )
}

export function RouteLoadingController() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isRouteLinkClick(event)) startRouteLoading()
    }

    document.addEventListener('click', handleClick)
    window.addEventListener('popstate', startRouteLoading)

    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('popstate', startRouteLoading)
    }
  }, [])

  return (
    <>
      <RouteLoadingIndicator initial />
      <Suspense fallback={null}>
        <NavigationCompletion />
      </Suspense>
    </>
  )
}
