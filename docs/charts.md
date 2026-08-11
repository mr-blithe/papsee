# Charts

Deep dive referenced from `AGENTS.md`. Read this before touching `src/components/panel/charts/`.

Charts are [uPlot](https://github.com/leeoniya/uPlot), wrapped once in
`src/components/panel/charts/signal-chart.tsx`. That wrapper owns every uPlot call in the codebase; everything
above it passes decimated arrays and a range. Four things about it are load bearing, and each one is a bug the
first time it is undone:

- **The sync keys are a fixed set.** `uPlot.sync(key)` keeps a module global map whose entries `unsub` never
  deletes, so a key derived per mount leaks one entry per chart. `CHART_SYNC_KEYS` is the whole list; a fullscreen
  stack needs its own key because the inline stack stays mounted behind it.
- **`cursor.sync.scales` must be `['x', null]`.** uPlot defaults to `['x', 'y']`, which lines the crosshair up by
  y _value_ across charts whose domains have nothing to do with each other.
- **A drag needs an origin guard.** Sync propagates `mousedown`, `mousemove` and `mouseup`, so every subscribed
  chart builds its own selection rect and fires its own `setSelect` hook. That is what makes one gesture shade the
  whole stack, and it is also why only the chart that received the real DOM `mousedown` may call `onZoom`.
- **Every chart labels its own minimum and maximum** down the left edge, through explicit `splits`. Left to
  uPlot's own tick choice a chart can end up labelled `0` and nothing else, which tells a reader nothing about its
  scale. `charts/axis.ts` holds that rule and is tested on its own, away from the canvas.

Two more constraints come from outside the wrapper:

- **`signal-chart.tsx` passes `tzDate` to uPlot.** uPlot formats its time axis with local getters unless told
  otherwise, so without it the axis and the session table would read hours apart. See Time in `AGENTS.md`.
- **uPlot reads its colours from CSS variables once, at construction**, so `signal-chart.tsx` rebuilds the chart
  when `resolvedTheme` changes. Without that the charts keep the old palette after a theme switch.

Fullscreen is a `Dialog` at `w-screen h-[100dvh]`, not the Fullscreen API, because `requestFullscreen()` on a div
does not work on iOS Safari and the phone is a first class target here.
