# AGENTS.md

Guidance for AI coding assistants working in this repository.

## What PapSee Is

PapSee is a web platform for people with sleep apnea to read their own PAP therapy data. A reader signs up, uploads
what their device wrote to its SD card, and gets the nights back: flow, pressure, leak and respiration charts, the
events the device scored, AHI and the other indices, session times, the settings the device was running, trends across
nights, and a JSON or CSV export to hand to a doctor. English and Turkish throughout, and an example patient that opens
every screen without an account. ResMed is the only brand that imports; every other one is recognised and refused.

It is OSCAR rebuilt for the web. OSCAR is the desktop tool this community trusts, but it is a local Qt application:
one machine, one install, manual imports, no account, nothing to share. PapSee keeps OSCAR's honesty about the data and
drops the desktop, in the shape SleepHQ has: your history follows you to any device.

The user is a patient, not a clinician. Motivated, reads forums, but not trained. A number on screen is either
self-explanatory or it gets explained.

`README.md` holds the product story and the roadmap. This file covers only what changes how you write code. Three
consequences of that direction are binding:

- **The parse layer runs on the server.** The browser fingerprints the card from its paths and uploads bytes, nothing
  more; `advanceCommit` parses and stores. `src/lib/pap/` stays framework free because both sides run it.
- **An import belongs to an account.** The import screen uploads a picked card in batches, the server parses it and
  writes the days, and every panel screen reads that back through the API rather than from anything held in React
  state. Nothing in the panel may assume a card is sitting in memory.
- **This is medical data.** See Product Constraints.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill BETTER_AUTH_SECRET
docker compose up -d postgres  # Postgres 17 on 5432, or point DATABASE_URL at one of your own
pnpm db:migrate              # apply drizzle/ to it
pnpm db:seed-contracts       # privacy and terms rows, without which those pages notFound()
pnpm dev                     # localhost:3000
```

`.env.local` is gitignored and `.env.example` is the checked in shape of it. `BETTER_AUTH_SECRET` is required.
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are optional: without them the Google button is not rendered at all,
which is what `isGoogleEnabled` in `src/lib/auth.ts` is for. `NEXT_PUBLIC_POSTHOG_ENABLED` is the analytics kill
switch and it is `false` in `.env.example`: `analyticsEnabled()` accepts the exact word `true` and nothing else, and
requires a production build on top of it, so neither a development session nor the test suite can report anything.

## Commands

Work file-scoped while iterating. Before you call anything done, run all five, in this order:

```bash
pnpm format         # Prettier, writes
pnpm lint           # ESLint
pnpm knip           # unused files, exports and dependencies
pnpm test           # Vitest, single run
pnpm build          # production build; this is the real type check
```

`pnpm format:check` is the read only variant for CI. `pnpm test:watch` while iterating. `pnpm start` serves the
production build.

There is no separate typecheck script. `pnpm build` runs TypeScript, so a build that passes is the type check.

Builds run on Turbopack, which is the Next.js default.

Database work: `pnpm db:generate` after editing `src/lib/db/schema.ts`, then `pnpm db:migrate` to apply. Never hand
write the Better Auth tables, see Auth and database below.

## Tooling

**Always use the skills and MCP tools your session carries. Reach for them first, not after you have already guessed.**
A library or API question goes to a documentation lookup tool before it goes to memory. A "what is the latest version"
question goes to the web. A skill that covers the kind of work in front of you gets read before you start it, not after
you are stuck. Writing from memory when a tool could have told you the answer is the failure mode this rule exists to
stop.

`.mcp.json` registers two MCP servers.

- **`shadcn`** for anything touching `src/components/ui/`. Search the registry, read a component's docs and API before adding or changing it, and add components through the CLI rather than pasting source. `components.json` holds the project's style, aliases and registries.
- **`next-devtools`** for the running application. It reads build, runtime and type errors, routes, page metadata and dev logs straight from the dev server. It needs `pnpm dev` running; without it the tools return nothing.

Sessions usually also carry documentation lookup, web search, browser automation and skills that this repository does
not register. They count the same. Browser automation in particular earns its keep here: the panel is behind auth and
the charts are interactive, so a screen is only verified once it has been driven in a real browser.

## Working Rules

**Verify, never guess.** Do not write code against a remembered API. Read the installed version's source or docs, or run it. If you cannot verify a claim, say so instead of asserting it. "It probably works like this" is not acceptable.

**Your memory of this stack is out of date.** Next.js, React, Tailwind and shadcn have all shipped breaking majors. Check what is installed and read its docs before writing against it. Next.js ships version-accurate docs in `node_modules/next/dist/docs/`. Versions come from `package.json`, never from this file and never from memory.

**Reuse before you write.** Search this repository first: the helper, the component or the hook you need may already exist. Extend it. If nothing fits, prefer a maintained library over a hand-rolled implementation. Writing something custom is the last option and must be called out so it can be challenged.

**KISS.** The simplest construct that works. Plain functions before patterns, local solutions before abstractions. Do not introduce an interface, a factory or a generic for a single call site.

**DRY, with judgement.** Two copies of a rule is how they drift apart. But do not deduplicate two things that merely look alike today.

**No over-engineering.** Implement what was asked. No speculative flags, options or extension points for a future nobody has described. YAGNI. Complexity is a purchase: if a change makes the code harder to read, it has to buy something a reviewer can name.

**Finish what you start.** No partial implementations, no silent narrowing of scope. If the scope has to change, say so explicitly.

**No code comments.** The code has to explain itself through naming and structure. The only comments that may be added are: a genuinely non-obvious constraint the code cannot express (a wire format, a race, a browser rule), a public-API docstring the tooling consumes, or a required directive such as `// eslint-disable-next-line`. Never narrate what the next line does, and never leave commented-out code.

**No AI slop.** Nobody should be able to tell from the diff that a model wrote it. That means no restating the obvious in prose or in comments, no defensive scaffolding for cases that cannot happen, no ceremonial abstraction, and naming that matches what is already here rather than a generic vocabulary of `handler`, `manager` and `data`.

**Leave it tidy.** Delete dead code, unused imports and files your change orphaned.

**Do not refactor what you were not asked about.** Keep diffs to the task. Mention anything else you noticed as a follow-up.

**Code beats documentation.** When this file, `README.md` or any comment disagrees with the code, the code is right by definition. Fix the document in the same change, and say that you did.

You absolutely must not add hardcoded UI copy. The project uses i18n, so inspect the existing structure and always add new UI copy to the appropriate language file under messages. Any text visible in the UI, including error messages returned by the API, must not be hardcoded in TS or TSX files.

## Testing

Vitest, configured in `vitest.config.mts`. `pnpm test` for a single run, `pnpm test:watch` while iterating.

- Tests are colocated as `src/**/*.test.ts`.
- The default environment is jsdom. A file that tests server code opts out with `// @vitest-environment node` on its
  first line, which is what `src/proxy.test.ts` does.
- `next-intl` is in `server.deps.inline` because Node's own resolver cannot follow its `next/server` import when the
  package is externalised.
- **`testTimeout` is 30s, not Vitest's 5s.** Writing a synthetic card and reading it back costs seconds on its own, and
  `--coverage` roughly doubles it, so the default failed on CI for tests that were not broken. Raise the number if a
  real test outgrows it; never paper over it with a per-test timeout, which is how the same rule ends up in two places.
- **No test may open a database connection, or reach any other live service.** The suite runs with no `DATABASE_URL`,
  no container and no network, so `pnpm test` behaves the same on a laptop, in CI and offline. `vitest.config.mts`
  deliberately does not load `.env.local`: a test that needs configuration takes it as an argument, the way
  `getSiteUrl(productionDomain)` does. Withholding credentials is not the same as refusing to connect, so the two
  services a test could still reach by supplying its own refuse outright: `sendContactMail` throws under
  `NODE_ENV=test` before it builds a transport, and analytics is off there by the rule above.
- **Mock the persistence boundary rather than reaching through it.** Where the code under test has to talk to storage,
  mock `@/lib/db` or the repository function it calls. This is the one place mocking is welcome, and it stops at the
  boundary: still assert the decision our code made, never that it handed the mock the arguments you just passed. See
  Test our code, never the library below.
- A rule that lives only in the database, a unique constraint or a cascade, cannot be pinned here, and a mock that
  agrees with the implementation does not pin it either. Leave it uncovered and say so rather than writing a test that
  goes green either way.
- `src/lib/pap/synthetic/card.ts` writes a whole ResMed card, and `src/lib/pap/edf/writer.ts` builds EDF files byte by
  byte, which is the only way to reach header rules like a declared record count of -1. The synthetic card is the
  fixture: there is no checked in real card, and nothing in this repository identifies a patient.

Next.js documents Vitest, Jest, Playwright and Cypress under `node_modules/next/dist/docs/01-app/02-guides/testing/`.
That guide recommends end to end tests over unit tests for async Server Components, because the ecosystem cannot yet
render them reliably in a unit test.

TDD: write the failing test first, then the smallest change that passes it, then refactor.

- A test must be able to fail. Assert the behaviour a user or a caller depends on, not that a function was called.
- **Prove it can fail.** Break the rule the test claims to pin, watch that test go red, then put the code back. A test
  that has never been seen failing is an assumption.
- **Every test earns its place by catching a bug.** Name the defect it would catch before you write it. Coverage is a byproduct of testing the right things and is never itself the goal. A suite that goes green on broken code is worse than no suite, because it makes the breakage look safe.
- Test the business rule, not a restatement of the implementation. Test real workflows end to end. A test that only mirrors the code has to be edited every time the code changes and cannot fail for any reason a user would notice.
- A parser bug starts with the test that reproduces it, using the real bytes that triggered it.
- Prefer verbose, explicit assertions over clever one-liners. Someone reading a failure has to see what was expected.
- **Test our code, never the library.** A test that mocks a third party and then asserts we called it with the arguments we just passed proves nothing: it restates the call site, it cannot fail for any reason a user would notice, and it has to be edited every time the call changes. Assert what our code decides, not what it hands over. If the only interesting behaviour is the library's, there is nothing here to test.

`src/lib/pap/` is where the real rules live, so it is where tests matter most, and it is pure functions over byte
arrays, so it is cheap to test properly. `src/lib/pap/synthetic/` is the fixture source: a card written by the same EDF
writer the device format demands, then read back through the real importer. Every item in the list under The PAP import
library below is a rule a test should pin, because each one is a silent wrong number if it regresses, not a crash.

## Architecture

```text
src/app/
  [locale]/      Every page. Locale segment, see Localization.
    (auth)/      Sign in and sign up.
    panel/       Signed in panel: onboarding, import, overview and therapy.
  api/           Route handlers. Deliberately outside [locale].
  icon.svg       Favicon. apple-icon.tsx generates the touch icon from the same mark.
  globals.css    Theme tokens. Written by the shadcn CLI too.
src/components/  React components.
  ui/            shadcn/ui components. Managed by the shadcn CLI.
  auth/          Sign in and sign up forms.
  panel/         Panel screens and their parts.
    charts/      Everything that touches uPlot, plus the axis maths and the frame around a chart.
  logo.tsx       The mark and the wordmark, including the Beta badge.
src/i18n/        next-intl routing, navigation and request config.
src/global.d.ts  Declares Messages on next-intl's AppConfig, so a missing key is a build error.
src/lib/         Utilities, including the cn helper.
  auth.ts        Better Auth server instance.
  auth-client.ts Better Auth React client.
  session.ts     getSession(), the cached server side session read.
  panel-context.ts  Who is reading the panel, and whether they are in demo mode.
  api.ts         apiError(), apiErrorKey() and the request size limit the route handlers share.
  terms.ts       The ids the term hints explain. messages.test.ts checks both catalogs against it.
  analytics.ts   The events PapSee reports, and the URL redaction every one of them passes through.
  db/            Drizzle client, the generated auth schema and the hand written pap schema.
  pap/           PAP data import library. Framework free, see below.
  therapy/       Stored imports: repository, day index, trends, demo data, the browser side client.
src/proxy.ts     next-intl middleware composed with the auth guard.
src/instrumentation-client.ts  PostHog, production builds only. See Product Constraints.
messages/        en.json and tr.json.
drizzle/         Generated SQL migrations. Do not hand edit.
```

`@/*` maps to `src/*`.

Where the application actually stands: `/` is still a placeholder and `/panel` redirects to `/panel/overview`. A signed
in reader is walked through `/panel/onboarding` for a profile, then `/panel/import` for a device specific guide and the
upload, and after that `/panel/overview` and `/panel/therapy` read what was stored. `panel-access.ts` enforces that
order in the page: no profile sends you to onboarding, no stored days sends you to import. There is no export yet, and
the policy pages are still owed.

### The stored import API

Every route reads `getPanelContext()`, answers `401` without a session, and scopes every query by `context.userId`.
Errors are a machine code, `{ "error": "notFound" }`, never a sentence: user facing wording is the caller's job, in
`messages/`, and `apiErrorKey()` in `src/lib/api.ts` is the one map from code to message key.

```text
POST   /api/imports              opens an import, returns its id
DELETE /api/imports              drops every import the account has, with its days, events and bytes
POST   /api/imports/[id]/files   one batch of card files, as a bundle body
POST   /api/imports/[id]/commit  parses and stores one slice of the import, call until it reports done
DELETE /api/imports/[id]         drops an import with its days, events and bytes
GET    /api/days?from=&to=       the day index, pure SQL, for trends and the day strip
GET    /api/days/[date]          that night, already parsed, streamed back as a day payload
GET    /api/export?format=&locale=  everything the account holds, streamed, as JSON or one CSV table
GET    /api/profile              the patient profile
PUT    /api/profile              validated by parseProfileInput, never trusted raw
POST   /api/demo                 enter the example patient
DELETE /api/demo                 leave it
```

- **The export builds tables once and serves them two ways.** `src/lib/therapy/export-tables.ts` turns stored days
  into `{ name, columns, rows }`, where the name and the columns are message keys rather than sentences, so the JSON
  and the six CSV tables in `EXPORT_DOWNLOADS` cannot drift apart. The route resolves those keys against the `locale`
  search param, which is how a route outside `[locale]` gets a language at all. Two rules are load bearing and both
  are pinned by a test: a CSV opens with a UTF-8 byte order mark, without which Excel reads it in the system code page
  and mangles every Turkish letter, and **a table name may not exceed 31 characters or hold `[ ] / \ : * ?`**, which
  [Excel rejects as a sheet name](https://support.microsoft.com/en-us/excel/rename-a-worksheet). Nothing writes a
  workbook yet, so that second rule is holding the names inside what one would accept rather than fixing a bug that
  exists today; it is cheap, and it is what stops a long translation from having to be renamed later.
- **Nothing reads a night by parsing bytes.** The import files stay in `pap_file` as the record of what the device
  wrote, but every screen reads the parsed form: `pap_day` for the summary, `pap_event` for the scored events and
  `pap_channel` for the waveforms. Re-parsing EDF on every day open is what made the panel slow, and it also meant
  opening one night re-derived the whole card's `STR.edf`.
- **A channel is stored the way the device wrote it.** `pap_channel.samples` holds the raw little endian Int16 samples
  with the one linear mapping (`scale`, `offset`) that turns them into physical units, so what is written and what is
  read back are identical by construction rather than by two formulas agreeing. `scale` and `offset` are
  `doublePrecision` on purpose: flow's gain is 0.12, which no float32 holds, and rounding it would break that equality.
  `src/lib/pap/digital.ts` owns the one derivation both sides use.
- **Demo mode is read only on the server, not just in the UI.** `getPanelContext()` reports it from a cookie, every
  mutating route answers `403 readOnlyDemo`, and the two read routes serve `src/lib/therapy/demo.ts` instead of the
  database. The generator is the same `writeSyntheticCard` the tests use and it travels the same day payload a stored
  night does, so nothing renders a special demo shape.
- **The panel chrome reads the demo cookie itself, through `useDemoMode`.** The banner, the import affordances and the
  settings item all sit in `panel/layout.tsx`, and a layout keeps whatever it first rendered: navigating between two
  panel routes re-renders the page but serves the shared shell from the client router cache, so a flag passed down from
  the layout went stale and the banner said nothing while the page below it was already serving the example patient. A
  `template.tsx` does not help, it is kept from that cache too. That is why `papsee.demo` is **not** `httpOnly`: it
  carries no secret, `POST /api/demo` sets it for anyone who asks, and being readable is what lets the shell agree with
  the server on every navigation and whenever the tab regains focus. The server value is still passed in, as the first
  paint before hydration. Anything else in the shell that has to track a cookie needs the same treatment.
- **The commit parses server side, one night per slice.** `advanceCommit` opens with the card level files alone,
  writes a summary only row per night from `STR.edf`, then fills one night at a time until a time budget is spent.
  A year of nights therefore never needs a single request large enough to parse all of it, and the client's own parse
  is never what gets stored, or a crafted request could write any number it liked into a reader's history.
  Every slice is idempotent, so the client retries rather than throwing away a long upload.
- **A day is replayed from the import that owns it.** `pap_file.dayId` is set at commit from the filename timestamp,
  because `DATALOG/20260809/` holds the sessions of the night that _started_ on the 8th.
- **Re-importing a night replaces it.** `pap_day` is unique on `(userId, date)`; every date the new card covers is
  deleted once, up front, in the opening slice, and the old day's events, channels and bytes go with it. An import left
  with no days is deleted there too rather than kept as orphaned bytes, so an abandoned commit cannot strand them.
- **Two wire formats, and they carry different things.** `src/lib/pap/bundle.ts` frames `PapFile[]` for the upload,
  which is an opaque list of paths and bytes. `src/lib/pap/day-payload.ts` frames one parsed night for the read. Both
  are hand written because no browser API parses a multipart response. Decode Int16 through a `DataView`, never an
  `Int16Array` view: `pg` gives no alignment guarantee and an odd byte offset throws.

Charts are [uPlot](https://github.com/leeoniya/uPlot), wrapped once in `src/components/panel/charts/signal-chart.tsx`.
That wrapper owns every uPlot call in the codebase; everything above it passes decimated arrays and a range. Four
things about it are load bearing, and each one is a bug the first time it is undone:

- **The sync keys are a fixed set.** `uPlot.sync(key)` keeps a module global map whose entries `unsub` never deletes,
  so a key derived per mount leaks one entry per chart. `CHART_SYNC_KEYS` is the whole list; a fullscreen stack needs
  its own key because the inline stack stays mounted behind it.
- **`cursor.sync.scales` must be `['x', null]`.** uPlot defaults to `['x', 'y']`, which lines the crosshair up by y
  _value_ across charts whose domains have nothing to do with each other.
- **A drag needs an origin guard.** Sync propagates `mousedown`, `mousemove` and `mouseup`, so every subscribed chart
  builds its own selection rect and fires its own `setSelect` hook. That is what makes one gesture shade the whole
  stack, and it is also why only the chart that received the real DOM `mousedown` may call `onZoom`.
- **Every chart labels its own minimum and maximum** down the left edge, through explicit `splits`. Left to uPlot's
  own tick choice a chart can end up labelled `0` and nothing else, which tells a reader nothing about its scale.
  `charts/axis.ts` holds that rule and is tested on its own, away from the canvas.

Fullscreen is a `Dialog` at `w-screen h-[100dvh]`, not the Fullscreen API, because `requestFullscreen()` on a div does
not work on iOS Safari and the phone is a first class target here.

### The PAP import library

`src/lib/pap/` reads a PAP device SD card. The parsing modules are framework free: no React, no DOM, no Node built-ins.
One marked exception may reach for Node: `*.server.ts`. The input is always `{ path, data: ArrayBuffer }[]`, so the
same code serves the browser folder picker and the server side commit.

```text
edf/       Generic EDF and EDF+ reader. Nothing ResMed specific.
resmed/    ResMed loader: Identification.json and .tgt, CurrentSettings.json, STR.edf, DATALOG.
detect.ts  Card brand fingerprints, from paths alone. Runs before anything is parsed.
device-time.ts Every clock reading a device wrote, and the therapy day key. See Time below.
stats.ts   Event indices, the AHI traced across a night, time at pressure, duration helpers.
decimate.ts Min/max envelope decimation for the charts.
digital.ts The stored form of a channel, and the one derivation back to physical units.
day-payload.ts The wire format one parsed night travels in, both from the database and from demo.
index.ts   readCardMetadata + buildDigitalDay, composed into importPapData(files, cardPaths) => PapImport.
sources.ts Browser adapters for the example data endpoint and a folder picker.
```

Things this code knows that are easy to get wrong, all verified against a real card or against OSCAR's source. Each one
is a silent wrong number if it regresses, not a crash, so each one has a test.

- ResMed writes `nrec` as 0 or -1 in EDF headers. The real record count comes from the file size.
- **Signal labels and event annotations are matched by longest prefix, case-insensitively**, never by equality. The
  device is inconsistent about case, and it localises its own labels: leak is also `Sızıntı`, `Fuites` and `Leck`.
  Longest wins because `Flow` is a prefix of `FlowLim.2s`.
- The S9 family writes short spaced labels (`Mask Dur`, `Leak Med`, `RR 95`) where the AirSense writes dotted ones
  (`Duration`, `Leak.50`, `RespRate.95`). Both belong in every lookup.
- AirSense 11 (model number >= 39000) shifts most setting enums by one against AirSense 10, `S.Mask` by two, and
  remaps therapy modes through a nine entry table. All of that lives in `resmed/enums.ts` and nowhere else.
- Which pressure signal is real depends on the mode: `S.C.*` CPAP, `S.A.*` or `S.AS.*` AutoSet, `S.AFH.*` AutoSet for
  Her. A mode we cannot represent reports null pressures rather than the signals the device left behind.
- The device truncates its own indices to one decimal, it does not round. `truncateToTenth` matches it.
- A ResMed day runs noon to noon, and `MaskOn`/`MaskOff` are minutes since that noon. `papDayKey` is that rule.
- Leak is stored in L/s and tidal volume in L. `resmed/channels.ts` is the only place those conversions happen.
- `-1` is the no data marker. A channel that is entirely `-1` (an absent oximeter) is dropped rather than plotted.

Raw ResMed signal labels appear only in `resmed/channels.ts` and `resmed/str.ts`. Everything above them speaks in
`ChannelId`.

ResMed is the only brand implemented, and `detect.ts` names the others rather than letting an unreadable card look
like an empty night. **Never let an unsupported card fall through as a blank panel**: a patient cannot tell that from
a good night. A second brand belongs beside `resmed/` behind the same `PapImport` shape, and it does not get to widen
that shape for itself.

`DEVICE-COVERAGE.md` records what each brand would cost, what is deliberately left undone and why. It is gitignored
and lives only in the maintainer's working copy, so read it before touching device support if you have it, and say
so rather than guessing if you do not.

Server Components are the default. Add `'use client'` only where a component genuinely needs state, effects or browser APIs, and push it as far down the tree as it will go.

`SiteHeader` reads the session so it can point a signed in reader at the panel instead of at sign in. That is a
request time read, so every route carrying the header, the landing page and the legal and contact pages included, is
server rendered on demand rather than prerendered. It is a deliberate trade against a button that flickers from one
label to the other after hydration, and reverting it to a client side session read would bring that flicker back.

## Time

date-fns is the date library. Nothing in this repository does calendar arithmetic by hand, and no new helper reimplements
adding a day, comparing two days or padding a date into a string.

**A device timestamp is a wall clock with no zone attached.** `20260809_014849_BRP.edf` means ten to two in the morning
in the bedroom the machine was standing in. It is not an instant, nobody recorded the offset, and there is nothing to
convert it to. So `src/lib/pap/device-time.ts` anchors every one of them to UTC through `UTCDate` from `@date-fns/utc`,
and that module is the only place a reading turns into a number:

- `deviceTime(year, month, day, hour, minute, second)` builds one from the parts a device wrote. Month is 1 based.
- `deviceTimeAt(atMs)` reads one back, so `format` and the getters give the clock the device showed.
- `papDayKey(atMs)` is the noon to noon therapy day. `papDayDate(key)` turns that key back into a date to render.
  `isPapDayKey(value)` accepts only what `papDayKey` produces, which is what guards the day routes.

**Never write `new Date(year, month - 1, day)`, `getHours()` or `getDate()` against device data.** Those read the
runtime's own zone. The parse runs in a browser today and on a server at commit, the render runs in both, and the two
machines do not agree: a therapy day built from local calendar parts in one zone and formatted in another lands on the
wrong date, and a session clock lands hours out. It looks correct on a development machine whose zone happens to match
the server and breaks in production, which is exactly how it shipped once.

The rendering side has to agree with the parse side, so:

- **`src/i18n/request.ts` pins `timeZone: DEVICE_TIME_ZONE`.** Without it next-intl falls back to the zone of whatever
  machine rendered, passes that down to the client, and every `format.dateTime` disagrees with the clock the device
  wrote. This is a correctness requirement, not a default worth revisiting.
- **`signal-chart.tsx` passes `tzDate` to uPlot** for the same reason. uPlot formats its time axis with local getters
  unless told otherwise, so without it the axis and the session table would read hours apart.
- **A day key becomes a label through `papDayDate`**, never through a locally built `Date`.
- The consequence, and it is deliberate: a real instant, such as when an import was committed, would also render in UTC.
  Nothing displays one yet. The first screen that wants to has to be given its own explicit zone rather than quietly
  unpinning the global one.

`pnpm test` runs under a deliberately distant `TZ`, set in `vitest.config.mts`, so a helper that slips back to local
time fails the suite instead of passing on a machine that sits close enough to UTC to hide it. Assert absolute values,
`Date.UTC(...)` or a `deviceTime(...)` call, never a local `new Date(...)` that would drift with the expectation.

## Auth and database

Better Auth over Drizzle over Postgres, email and password plus Google. Local development runs against a Postgres 17
of your own on 5432, named by `DATABASE_URL`.

- **Two schema files, one client.** `src/lib/db/schema.ts` belongs to the Better Auth CLI. Everything PapSee owns lives
  in `src/lib/db/pap-schema.ts`, which imports `user` for its foreign keys, and `src/lib/db/index.ts` composes both.
  `drizzle.config.ts` lists both paths, so a table added to only one of them silently never reaches a migration.
  `bytea` has no drizzle column of its own and comes from `customType` there.
- **Never hand write the auth tables.** `src/lib/db/schema.ts` is generated by `npx auth@latest generate`. Change
  `src/lib/auth.ts`, regenerate, then `pnpm db:generate && pnpm db:migrate`. The file is Prettier ignored because the
  CLI owns its formatting. The CLI package is `auth`; the old `@better-auth/cli` is stranded on an older version.
- **The adapter lives in `@better-auth/drizzle-adapter`**, not in a `better-auth/adapters/*` subpath.
- **`nextCookies()` must stay last** in the plugin array.
- **The proxy guard is optimistic, on purpose.** `src/proxy.ts` uses `getSessionCookie`, which only parses a cookie and
  never touches the database, so it costs nothing per request. It is not a security boundary.
- **The real check belongs in the page.** `getSession()` from `src/lib/session.ts` is the cached server side read.
  Next.js is explicit that a layout is the wrong place for an auth check, because layouts do not re-render on
  navigation and do not stop nested segments from rendering. A layout may read the session to display it, as
  `panel/layout.tsx` does for the user menu, but the redirect lives in the page.
- **A signed in reader never sees the auth pages.** `requireSignedOut()` in `src/lib/session.ts` sends them to
  `/panel`, and it lives in the sign in and sign up pages for the reason above. Demo mode is not a session, so a
  reader looking at the example patient can still reach both.
- **Sign up is captcha gated, sign in is not.** `src/lib/auth.ts` adds the Better Auth `captcha` plugin scoped to
  `/sign-up/email` with `expectedAction: 'sign-up'`, and only when `TURNSTILE_SECRET_KEY` and
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are both set, the same way `isGoogleEnabled` gates Google. Half a pair therefore
  leaves sign up unprotected rather than broken. The token travels in the `x-captcha-response` header, which is the
  only name the plugin reads. The action is checked because both widgets share one site key, so without it a token
  minted for the contact form would be redeemable at sign up. That check also rules out Cloudflare's testing keys:
  their siteverify response carries no `action` at all.
- Deleting a user cascades to `session` and `account`, and now to `patient_profile`, `pap_import`, `pap_day`,
  `pap_event` and `pap_file` as well, which is what the GDPR and KVKK delete path will need.

## Deployment

Vercel for the application, Neon for Postgres. Local development stays on your own local Postgres; nothing here
changes that.

- **The data stays in the EU.** The Neon project lives in `aws-eu-central-1`, AWS Europe (Frankfurt), and
  `vercel.json` pins functions to `fra1`, the Vercel region in the same city. This is a requirement, not a
  performance tuning choice: an import is special category personal data under GDPR and KVKK. Neon's London region
  `aws-eu-west-2` is **not** an EU region and must not be used for this.
- **`DATABASE_URL` is what the application runs on, and in production it is the pooled endpoint**, the hostname with
  `-pooler` in it. `src/lib/db/index.ts` and `scripts/seed-contracts.ts` read it and nothing else. The application is
  what forces the choice: a Vercel function opens a connection per invocation, which
  [Neon lists](https://neon.com/docs/connect/connection-pooling) as the classic way to exhaust a direct endpoint,
  where a 0.25 CU compute allows 104 connections with seven reserved. The pooled endpoint takes 10,000.
- **`DATABASE_URL_UNPOOLED` is the direct endpoint, and Drizzle Kit is the only thing that reads it.**
  `drizzle.config.ts` prefers it and falls back to `DATABASE_URL` when it is empty or unset, because the same Neon page
  advises against schema migrations over PgBouncer: a tool may need session state transaction pooling does not keep,
  and a migration that fails with something that looks unrelated is the first thing to suspect. A Postgres reached
  directly has no pooler to route around, so a local checkout, the docker compose and CI all leave it unset and run on
  the one variable. Seeding stays on `DATABASE_URL` because it is ordinary inserts, which transaction pooling handles.
- **No client side pool on top of the pooled endpoint.** Neon runs PgBouncer already, and stacking a second pool on
  it causes connection conflicts.
- **`pg` is the right driver here and no Neon specific package is needed.** `@neondatabase/serverless` exists for
  edge runtimes that cannot open a TCP socket. This app runs on the Node runtime, where Neon documents `pg` as the
  standard choice, so the driver already in `package.json` is the one to keep.
- **A Vercel function may not receive or return more than 4.5 MB**, it is a platform limit no config raises, and the
  caller sees a platform error rather than anything the handler wrote:
  [functions/limitations](https://vercel.com/docs/functions/limitations#request-body-size). A single night of
  waveforms is larger than that, which is why an import is uploaded in batches under `MAX_REQUEST_BODY_BYTES` and why
  `GET /api/days/[date]` returns a `ReadableStream` that pulls one stored file at a time. Buffering that response into
  a single body would work on every card small enough to test with and fail on a real one.

### Self hosting

The hosted instance is not the only deployment any more. `Dockerfile` and `compose.yaml` are a supported path and
the README documents them, so a change that only works on Vercel is a broken change.

- **The image is a `output: 'standalone'` build.** `next.config.ts` sets it, the runtime stage copies
  `.next/standalone` and `.next/static` and nothing else, and no `node_modules` is installed there. Anything read
  from disk at runtime that the tracer cannot see will be missing from the image and present everywhere else.
- **Migrating and seeding happen from the `migrate` stage, not the runtime one.** Drizzle Kit and tsx are
  devDependencies. `compose.yaml` runs that stage to completion before the app starts.
- **`SITE_DOMAIN` names the host, without a scheme.** `getSiteUrl()` prefers it over `VERCEL_PROJECT_PRODUCTION_URL`,
  which is how an image built by a stranger learns where it is served from. Vercel keeps working untouched because
  the variable is simply unset there.
- **`robots.ts` and `sitemap.ts` are `force-dynamic` for that reason.** Next
  [caches both by default](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), which bakes
  in whatever domain the build machine knew. On Vercel that is right by accident; for an image built before anyone
  chose a domain it is `localhost:3000` in a published sitemap.
- **`NEXT_PUBLIC_*` values are inlined at build time**, so the container passes them as build args and changing one
  needs a rebuild rather than a restart. Nothing may start reading a `NEXT_PUBLIC_*` variable expecting it to be
  configurable at run time.
- **`NEXT_PUBLIC_SOURCE_URL` is the AGPL source offer**, rendered by both footers and the landing page and hidden
  when unset. A fork that changes the code and serves it over a network is asked to point it at its own source, not
  at this repository.

## Localization

next-intl, `localePrefix: 'as-needed'`. English has no prefix, Turkish is `/tr/...`.

- **No hardcoded user facing string, ever.** Every message lives in `messages/en.json` and `messages/tr.json`, and both
  change in the same edit. `src/i18n/messages.test.ts` fails on a missing key, a blank message, a placeholder mismatch,
  or a `ChannelId`, `PapEventType` or `TermId` without an entry in either catalog.
- **A key that is in neither catalog is a build error.** `src/global.d.ts` declares `Messages: typeof en` on next-intl's
  `AppConfig`, so `t('nope')` does not compile. Without it a missing key is invisible: the catalogs still match each
  other, and next-intl quietly prints the key path onto the screen. A computed key therefore has to be narrowed to a
  union before it reaches `t()`, which is what `apiErrorKey()` and `authErrorKey()` are for.
- **A plural body must start with `#`, in every language.** The placeholder check reads `{word` as an interpolation, so
  `other {verisi olan # gece}` looks like a placeholder named `verisi` and fails parity against the English.
- **UI chrome is translated, device data is not.** What the device reports about itself is data, not copy: therapy mode
  names, mask type, `On`/`Off`/`Auto`, the setting group titles. Clinical abbreviations (AHI, EPR, RERA, CPAP) stay as
  they are in both languages. We do not invent a Turkish vocabulary for ResMed features.
- **Write every language in its own alphabet, in full.** A Turkish string uses `ç ğ ı İ ö ş ü` wherever the word takes
  them: `öküz`, never `okuz`; `Sızıntı`, never `Sizinti`; `değil`, never `degil`. Watch the dotted and dotless i in
  particular, because they are different letters and swapping them changes the word. Stripping accents to keep a
  string ASCII is never acceptable, in any language the project ships.
- Server side errors are mapped to translated messages by code, not shown raw. `src/lib/auth-errors.ts` is the map; an
  unmapped code falls back to a translated generic.
- `useTranslations` is a hook, so it cannot be called inside conditional JSX. Hoist it.
- Every route is under `src/app/[locale]/`. `src/app/api/` stays outside it and the proxy matcher excludes `/api`.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` and the export to `proxy`. A matcher written against the old name
  silently never runs.

## Theme

next-themes, `attribute="class"`, dark by default, system respected. `src/components/theme-toggle.tsx` swaps its icon
through the `dark:` CSS variant rather than a `mounted` flag, because the usual next-themes mounted pattern trips
`react-hooks/set-state-in-effect` and CSS sidesteps the hydration mismatch entirely.

uPlot reads its colours from CSS variables once, at construction. `signal-chart.tsx` therefore rebuilds the chart when
`resolvedTheme` changes; without that the charts keep the old palette after a theme switch.

## UI and UX

Mobile and responsive are the first priority, not a pass at the end. Design the phone first and let it grow. A screen
that only works at 1440px is not finished, and neither is one that technically reflows but is unusable with a thumb.

- **Build from shadcn.** Search the registry through the `shadcn` MCP server and add through the CLI. If the primitive exists there, you do not hand roll it.
- **Base UI, not Radix.** Triggers take `render={<Button/>}`, not `asChild`, and parts have real parent requirements: a `DropdownMenuLabel` outside a `DropdownMenuGroup` throws at runtime, not at build. The examples on the shadcn site are `new-york-v4` and use Radix conventions this project's `base-nova` style does not share.
- **`src/components/ui/` belongs to the CLI.** Do not edit a component's source to get something props, `className` or a small wrapper in `src/components/panel/` would give you. When an edit is genuinely necessary, keep it minimal and deliberate: you now own it through every future update.
- **Tokens, not values.** Colour, radius and spacing come from the CSS variables in `src/app/globals.css`. Both themes have to hold.
- **It has to look considered.** No gradient headers, no icon glued to every label, no three shadow depths on one screen, no marketing adjectives in product copy. Aim for the calm density of a clinical tool. The data is the design.
- **Copy describes the night, not the implementation.** The reader is a patient looking at their own sleep, not a
  reviewer of this codebase. Never put a file name, a folder, a signal label, a data structure or a rendering
  technique in a user facing string: not `Percentiles as computed by the device itself and stored in STR.edf`, not
  `Read from SETTINGS/CurrentSettings.json`, not `Charts draw a min/max envelope per pixel column`. Say what the
  number is and move on. If a caveat genuinely changes how someone should read a number, keep it to one plain
  sentence; if it does not, cut it.
- **SD cards belong to the import step and nowhere else.** The folder picker and its hints may name the card, because
  that is the thing the reader is being asked to find. Page titles, metadata, the landing page and every panel below
  the import are about therapy data, not about where it came from. Do not let the storage medium leak into the
  product's description of itself.
- **Charts are the product.** They must stay legible and operable on a phone: real touch targets, no hover-only affordance, no interaction that needs a mouse to discover.
- **Accessibility is part of done.** Real semantics, labelled controls, keyboard reachable, visible focus, contrast that survives both themes.

## Product Constraints

**This is health data.** An import identifies a person and describes their treatment. It is special category personal
data under GDPR and Turkey's KVKK, so per user isolation, encryption at rest, and working export and delete paths are
not optional. **No third party may see the contents of an import**, and that includes analytics: nothing derived from
a night, a session, an event or a setting may be attached to an event leaving the browser.

**Analytics is off by default and bounded by `src/instrumentation-client.ts`.** `analyticsEnabled()` in
`src/lib/analytics.ts` is the kill switch: PostHog initialises only when `NEXT_PUBLIC_POSTHOG_ENABLED` is exactly
`true` **and** the build is production, so a development run and the test suite report nothing. `trackEvent` also
returns early on an uninitialised instance, which is what keeps a component test silent. Three of the init settings
are load bearing rather than preference. `autocapture: false`,
because autocapture sends the text of whatever was clicked and on the panel that text is a date, an AHI or a pressure.
`disable_session_recording: true`, because a replay of the panel is a recording of someone's therapy history, and the
flag has to be set here rather than left to the PostHog project. `before_send: redactCapturedUrls`, because
`/panel/therapy?date=2026-08-09` puts a night in the address bar and `redactCapturedUrls` in `src/lib/analytics.ts`
strips every query and fragment before an event is sent. That redaction is pinned by a test; the other two are not,
because a config value a test asserts is a config value restated twice. The events themselves are the union in
`analytics.ts` and nothing calls `posthog.capture` directly. `posthog.identify` is never called, so no person profile
is built and no account is named to PostHog.

**Cookies: essential, plus one for analytics.** Session, locale, theme and `papsee.demo` are strictly necessary. The
demo cookie is not httpOnly, lasts a day, and only records that the reader asked to look at the example patient. The
PostHog cookie is not strictly necessary, and the privacy policy in `src/lib/contract-seeds.ts` discloses it in both
languages under legitimate interest. There is no consent banner. Adding another non-essential cookie means revisiting
that decision rather than assuming it: a banner that consents to nothing is worse than none, so raise the tension.

**The policy pages are still owed.** A privacy policy, terms, and a plain-language data disclosure, as real routes
under `src/app/[locale]/` in both languages. They are content, not scaffolding: draft them for the maintainer to
review rather than generating and shipping them silently.

**PapSee is not a medical device.** It reports what the device recorded. It does not diagnose, it does not titrate, and
it never tells anyone to change a setting. Keep the copy descriptive.

**OSCAR is GPL v3, and its README asks derivatives to credit SleepyHead by name.** Read OSCAR to learn what a device
writes and which numbers matter, then implement it here from the data. Do not copy its source and do not port a file of
it line by line. Every rule in `src/lib/pap/` was verified against a real card and is pinned by a test against the
synthetic one, and that is the bar for the next one.

## Conventions

- TypeScript, strict.
- Prettier owns formatting. `.prettierignore` excludes what a CLI writes: `src/components/ui/`, `src/lib/db/schema.ts`
  and `src/app/globals.css`. Leave those in the style the CLI produced rather than fighting it on every update.
- Style with Tailwind utility classes. Compose conditional classes through `cn`, never by concatenating strings.
- Theming goes through the CSS variables in `src/app/globals.css`. Do not hardcode a colour a token already names.
- Treat `src/components/ui/` as owned by the shadcn CLI. Local edits are allowed but they are yours to maintain, so keep them small and deliberate.
- Icons come from the icon library named in `components.json`.
- **Icons must come from `lucide-react`. Never hand write an SVG icon.** SVG remains appropriate for data visualisations, charts and the established PapSee logo mark, which are not interface icons.
- Dates go through date-fns, and anything a device wrote goes through `src/lib/pap/device-time.ts`. See Time.
- Identifiers are English. All user facing copy is English and Turkish, in `messages/`, never inline.
- Never use an em dash, in code, copy, docs or commit messages.
- Prefer `next/link`, `next/image` and built-in Next.js patterns. Inside the app, use `Link`, `redirect`, `useRouter`
  and `getPathname` from `@/i18n/navigation` so the locale prefix survives.
- Keep secrets and server-only access out of client bundles.
- Pin a version rather than bypassing pnpm's `minimumReleaseAge` gate. A package published hours ago is exactly what
  that gate is for, and this is health software. The `pg-protocol` override in `pnpm-workspace.yaml` exists for that
  reason and can go whenever `pg` is next bumped deliberately.

## Safety

Do without asking: read anything, run `format`, `lint`, `knip`, `test` and `build`, and run migrations against the local
docker Postgres.

Ask first: adding a dependency (say why, and why nothing installed does the job), changing auth, `src/proxy.ts` or `next.config.ts`, editing environment files, anything that writes to a database that is not the local docker one, `git push`, and deploying.

Never: copy GPL licensed source into this repository, or send the contents of a PAP import anywhere outside it.

**This repository is written to be made public, so nothing in it identifies anyone.** No real names, email addresses,
usernames, handles, machine names, absolute home directory paths, device serial numbers or local account details, in
code, comments, tests, fixtures, commit messages, documentation or this file. That includes the maintainer: write
"the maintainer" or "the reviewer", never a person's name, and do not record who decided something or who to ask.
Refer to people by role. If a fact only matters because of who is involved, it does not belong in the repository at
all. The one exception is required attribution, such as a licence header or the SleepyHead credit OSCAR asks for.
The repository is published under the handle `mr-blithe`, which is the only identifier that belongs in a URL here.

## Licence

PapSee is **AGPL v3**, in `LICENSE`, verbatim from the FSF, and `package.json` carries the matching
`AGPL-3.0-only`. Everything contributed is under the same terms and there is no separate CLA. Two consequences:

- **A dependency's licence has to be compatible.** Anything that cannot be distributed under the AGPL, or that adds
  a further restriction, cannot go in. This is a reason a package gets rejected, alongside maintenance and size.
- **The source offer in the footer is part of the licence, not decoration.** See Self hosting.

Reading OSCAR is still fine and copying it is still not. GPL v3 code cannot be pasted into an AGPL v3 project and
relicensed, and the rule in Safety stands unchanged.

`CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` and the templates in `.github/` are the public facing rules.
They restate parts of this file on purpose, for people who will never read it, so a rule that changes here has to
change there too.

## Pull Requests

Commit messages and PR descriptions are English, imperative, and say what changed and why. Run the full five command set
under Commands before opening one.

## Keeping This File Honest

If a change makes something here wrong, fix this file in the same commit. Documentation loses to code: when they
disagree, the code is the specification and this file is the bug.

Keep it light. This is a standing brief, not a changelog. Record rules and constraints that outlive a single change,
never a log of what was done.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
