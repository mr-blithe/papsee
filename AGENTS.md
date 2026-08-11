# AGENTS.md

Guidance for AI coding assistants working in this repository.

**PapSee is public and open source**, on GitHub under AGPL v3. Every line written here is read by strangers. Two
standing rules follow and both are non negotiable: nothing in the repository identifies anyone, see Safety, and
everything contributed carries the same licence, see Licence.

## What PapSee Is

PapSee is a web platform for people with sleep apnea to read their own PAP therapy data. A reader signs up,
uploads what their device wrote to its SD card, and gets the nights back: flow, pressure, leak and respiration
charts, the events the device scored, AHI and the other indices, session times, the settings the device was
running, trends across nights, and a JSON or CSV export to hand to a doctor. English and Turkish throughout, and
an example patient that opens every screen without an account. ResMed and Löwenstein prisma import; every other
brand is recognised and refused.

It is OSCAR rebuilt for the web, in the shape SleepHQ has: your history follows you to any device. The user is a
patient, not a clinician. Motivated, reads forums, but not trained. A number on screen is either self-explanatory
or it gets explained.

`README.md` holds the product story and the roadmap. This file covers only what changes how you write code. Three
consequences of that direction are binding:

- **The parse layer runs on the server.** The browser fingerprints the card from its paths and uploads bytes,
  nothing more; `advanceCommit` parses and stores. `src/lib/pap/` stays framework free because both sides run it.
- **An import belongs to an account.** Every panel screen reads stored days back through the API rather than from
  anything held in React state. Nothing in the panel may assume a card is sitting in memory.
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

`.env.local` is gitignored; `.env.example` is the checked in shape of it. Optional variables degrade rather than
break: without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` the Google button is not rendered at all, which is
what `isGoogleEnabled` in `src/lib/auth.ts` is for, and SMTP gates address confirmation the same way. See
[docs/auth.md](docs/auth.md).

## Commands

Work file-scoped while iterating. Before you call anything done, run all five, in this order:

```bash
pnpm format         # Prettier, writes
pnpm lint           # ESLint
pnpm knip           # unused files, exports and dependencies
pnpm test           # Vitest, single run
pnpm build          # production build; this is the real type check
```

There is no separate typecheck script: `pnpm build` runs TypeScript, so a build that passes is the type check.
Builds run on Turbopack. `pnpm format:check` is the read only variant for CI, `pnpm test:watch` while iterating,
`pnpm start` serves the production build.

Database work: `pnpm db:generate` after editing a schema file, then `pnpm db:migrate` to apply.
`pnpm db:promote-admin someone@example.com` makes an existing account an admin, which is how the first one is
created.

## Tooling

**Always use the skills and MCP tools your session carries. Reach for them first, not after you have already
guessed.** A library or API question goes to a documentation lookup tool before it goes to memory. A "what is the
latest version" question goes to the web. A skill that covers the kind of work in front of you gets read before
you start it. Writing from memory when a tool could have told you the answer is the failure mode this rule exists
to stop.

`.mcp.json` registers two servers:

- **`shadcn`** for anything touching `src/components/ui/`. Search the registry, read a component's docs and API
  before adding or changing it, and add components through the CLI rather than pasting source. `components.json`
  holds the project's style, aliases and registries.
- **`next-devtools`** for the running application: build, runtime and type errors, routes, page metadata and dev
  logs straight from the dev server. It needs `pnpm dev` running.

Sessions usually also carry documentation lookup, web search and browser automation. They count the same. Browser
automation in particular earns its keep here: the panel is behind auth and the charts are interactive, so a screen
is only verified once it has been driven in a real browser.

## Working Rules

**Verify, never guess.** Do not write code against a remembered API. Read the installed version's source or docs,
or run it. If you cannot verify a claim, say so instead of asserting it.

**Your memory of this stack is out of date.** Next.js, React, Tailwind and shadcn have all shipped breaking
majors. Next.js ships version-accurate docs in `node_modules/next/dist/docs/`. Versions come from `package.json`,
never from this file and never from memory.

**Reuse before you write.** Search this repository first: the helper, the component or the hook you need may
already exist. If nothing fits, prefer a maintained library. Writing something custom is the last option and must
be called out so it can be challenged.

**Finish what you start.** No partial implementations, no silent narrowing of scope. If the scope has to change,
say so explicitly.

**Do not refactor what you were not asked about.** Keep diffs to the task and mention anything else you noticed as
a follow-up.

**No code comments.** The code has to explain itself through naming and structure. The only comments that may be
added are: a genuinely non-obvious constraint the code cannot express (a wire format, a race, a browser rule), a
public-API docstring the tooling consumes, or a required directive such as `// eslint-disable-next-line`. Never
narrate what the next line does, and never leave commented-out code.

**No AI slop.** Nobody should be able to tell from the diff that a model wrote it: no restating the obvious, no
defensive scaffolding for cases that cannot happen, no ceremonial abstraction, and naming that matches what is
already here rather than a generic vocabulary of `handler`, `manager` and `data`.

**Leave it tidy.** Delete dead code, unused imports and files your change orphaned.

**Code beats documentation.** When this file, `docs/`, `README.md` or any comment disagrees with the code, the
code is right by definition. Fix the document in the same change, and say that you did.

## Testing

Vitest, configured in `vitest.config.mts`. Tests are colocated as `src/**/*.test.{ts,tsx}`. The default
environment is jsdom; a file that tests server code opts out with `// @vitest-environment node` on its first line.
`next-intl` is in `server.deps.inline` because Node's own resolver cannot follow its `next/server` import when the
package is externalised.

- **`testTimeout` is 30s, not Vitest's 5s.** Writing a synthetic card and reading it back costs seconds on its
  own, and `--coverage` roughly doubles it. Raise the number if a real test outgrows it; never paper over it with
  a per-test timeout, which is how the same rule ends up in two places.
- **No test may open a database connection, or reach any other live service.** The suite runs with no
  `DATABASE_URL`, no container and no network, so `pnpm test` behaves the same on a laptop, in CI and offline.
  `vitest.config.mts` deliberately does not load `.env.local`: a test that needs configuration takes it as an
  argument, the way `getSiteUrl(productionDomain)` does. Withholding credentials is not the same as refusing to
  connect, so the two services a test could still reach by supplying its own refuse outright: `sendContactMail`
  throws under `NODE_ENV=test` before it builds a transport, and analytics is off there.
- **Mock the persistence boundary rather than reaching through it.** Mock `@/lib/db` or the repository function
  the code under test calls. This is the one place mocking is welcome, and it stops at the boundary.
- **Test our code, never the library.** A test that mocks a third party and then asserts we called it with the
  arguments we just passed proves nothing: it restates the call site, it cannot fail for any reason a user would
  notice, and it has to be edited every time the call changes. Assert what our code decides, not what it hands
  over.
- A rule that lives only in the database, a unique constraint or a cascade, cannot be pinned here, and a mock that
  agrees with the implementation does not pin it either. Leave it uncovered and say so rather than writing a test
  that goes green either way.

TDD: write the failing test first, then the smallest change that passes it, then refactor.

- **Prove it can fail.** Break the rule the test claims to pin, watch that test go red, then put the code back. A
  test that has never been seen failing is an assumption.
- **Every test earns its place by catching a bug.** Name the defect it would catch before you write it. Coverage
  is a byproduct and never the goal. A suite that goes green on broken code is worse than no suite, because it
  makes the breakage look safe.
- Test the business rule, not a restatement of the implementation. A test that only mirrors the code has to be
  edited every time the code changes and cannot fail for any reason a user would notice.
- Prefer verbose, explicit assertions over clever one-liners. Someone reading a failure has to see what was
  expected.

`src/lib/pap/` is where the real rules live, so it is where tests matter most, and it is pure functions over byte
arrays, so it is cheap to test properly. See [docs/pap-import.md](docs/pap-import.md).

Next.js documents its testing setup under `node_modules/next/dist/docs/01-app/02-guides/testing/`, and recommends
end to end tests over unit tests for async Server Components.

## Architecture

`@/*` maps to `src/*`. Every page lives under `src/app/[locale]/`; `src/app/api/` stays outside it and the proxy
matcher excludes `/api`. `drizzle/` is generated SQL migrations and is never hand edited. `src/proxy.ts` is
next-intl middleware composed with the auth guard.

`/` is the landing page and `/panel` redirects to `/panel/overview`. A signed in reader is walked through
`/panel/onboarding` for a profile, then `/panel/import` for a device specific guide and the upload, and after that
`/panel/overview` and `/panel/therapy` read what was stored. `panel-access.ts` enforces that order in the page: no
profile sends you to onboarding, no stored days sends you to import. `/panel/settings` holds the profile, the
export downloads, the share links and the destructive actions. `/share/[token]` redeems a link and `/share` is
where a dead one lands. `/privacy` and `/terms` render the seeded contracts. `/admin` is the operator area.

Server Components are the default. Add `'use client'` only where a component genuinely needs state, effects or
browser APIs, and push it as far down the tree as it will go.

`SiteHeader` reads the session so it can point a signed in reader at the panel instead of at sign in. That is a
request time read, so every route carrying the header, the landing page and the legal and contact pages included,
is server rendered on demand rather than prerendered. It is a deliberate trade against a button that flickers from
one label to the other after hydration.

Four areas carry rules dense enough to have their own file. Read the relevant one before working in that area:

- **[docs/pap-import.md](docs/pap-import.md)** for `src/lib/pap/`: the module map, the brand seam, and every
  device rule that is a silent wrong number if it regresses.
- **[docs/therapy-storage.md](docs/therapy-storage.md)** for `src/app/api/` and `src/lib/therapy/`: the route
  list, the stored form of a night, the commit, the export, and the `PanelContext` union that decides whose data
  is being read.
- **[docs/auth.md](docs/auth.md)** for `src/lib/auth.ts`, `src/lib/db/`, `src/proxy.ts` and `src/lib/admin/`.
- **[docs/deployment.md](docs/deployment.md)** for Vercel, Neon and the self hosted image.
- **[docs/charts.md](docs/charts.md)** for `src/components/panel/charts/` and the uPlot wrapper.

## Time

date-fns is the date library. Nothing in this repository does calendar arithmetic by hand, and no new helper
reimplements adding a day, comparing two days or padding a date into a string.

**A device timestamp is a wall clock with no zone attached.** `20260809_014849_BRP.edf` means ten to two in the
morning in the bedroom the machine was standing in. It is not an instant, nobody recorded the offset, and there is
nothing to convert it to. So `src/lib/pap/device-time.ts` anchors every one of them to UTC through `UTCDate` from
`@date-fns/utc`, and that module is the only place a reading turns into a number: `deviceTime(...)` builds one
from the parts a device wrote (month is 1 based), `deviceTimeAt(atMs)` reads one back, `papDayKey(atMs)` is the
noon to noon therapy day, `papDayDate(key)` turns that key back into a date to render, and `isPapDayKey(value)`
guards the day routes.

**Never write `new Date(year, month - 1, day)`, `getHours()` or `getDate()` against device data.** Those read the
runtime's own zone. The parse runs in a browser today and on a server at commit, the render runs in both, and the
two machines do not agree: a therapy day built from local calendar parts in one zone and formatted in another
lands on the wrong date. It looks correct on a development machine whose zone happens to match the server and
breaks in production, which is exactly how it shipped once.

The rendering side has to agree with the parse side, so:

- **`src/i18n/request.ts` pins `timeZone: DEVICE_TIME_ZONE`.** Without it next-intl falls back to the zone of
  whatever machine rendered and every `format.dateTime` disagrees with the clock the device wrote. This is a
  correctness requirement, not a default worth revisiting. `signal-chart.tsx` passes `tzDate` to uPlot for the
  same reason.
- **A day key becomes a label through `papDayDate`**, never through a locally built `Date`.
- **A real instant needs its own zone, or none at all.** The global pin means a commit time or a sign up time
  would otherwise render in UTC by accident rather than by decision. The admin panel answers it twice over:
  `format.relativeTime` where "signed up 3 months ago" is what an operator is asking, and an explicit `timeZone`
  passed to `format.dateTime` with the column labelled UTC where an absolute stamp is genuinely needed. That
  constant is local to the screen and deliberately **not** `DEVICE_TIME_ZONE`: one means "a device wall clock
  carries no zone", the other "a log is read in UTC by convention". A new screen showing an instant makes the same
  choice rather than unpinning the global zone.

`pnpm test` runs under a deliberately distant `TZ`, set in `vitest.config.mts`, so a helper that slips back to
local time fails the suite instead of passing on a machine that sits close enough to UTC to hide it. Assert
absolute values, `Date.UTC(...)` or a `deviceTime(...)` call, never a local `new Date(...)`.

## Localization

next-intl, `localePrefix: 'as-needed'`. English has no prefix, Turkish is `/tr/...`.

- **No hardcoded user facing string, ever.** Every message lives in `messages/en.json` and `messages/tr.json`, and
  both change in the same edit. This includes error messages returned by the API. `src/i18n/messages.test.ts`
  fails on a missing key, a blank message, a placeholder mismatch, or a `ChannelId`, `PapEventType` or `TermId`
  without an entry in either catalog.
- **A key that is in neither catalog is a build error.** `src/global.d.ts` declares `Messages: typeof en` on
  next-intl's `AppConfig`, so `t('nope')` does not compile. Without it a missing key is invisible: the catalogs
  still match each other, and next-intl quietly prints the key path onto the screen. A computed key therefore has
  to be narrowed to a union before it reaches `t()`, which is what `apiErrorKey()` and `authErrorKey()` are for.
- **A plural body must start with `#`, in every language.** The placeholder check reads `{word` as an
  interpolation, so `other {verisi olan # gece}` looks like a placeholder named `verisi` and fails parity against
  the English.
- **UI chrome is translated, device data is not.** What the device reports about itself is data, not copy: therapy
  mode names, mask type, `On`/`Off`/`Auto`, the setting group titles. Clinical abbreviations (AHI, EPR, RERA,
  CPAP) stay as they are in both languages. We do not invent a Turkish vocabulary for ResMed features.
- **Write every language in its own alphabet, in full.** A Turkish string uses `ç ğ ı İ ö ş ü` wherever the word
  takes them: `öküz`, never `okuz`; `Sızıntı`, never `Sizinti`. Watch the dotted and dotless i in particular,
  because they are different letters and swapping them changes the word. Stripping accents to keep a string ASCII
  is never acceptable, in any language the project ships.
- Server side errors are mapped to translated messages by code, not shown raw. `src/lib/auth-errors.ts` is the
  map; an unmapped code falls back to a translated generic.
- `useTranslations` is a hook, so it cannot be called inside conditional JSX. Hoist it.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` and the export to `proxy`. A matcher written against the old
  name silently never runs.

## UI and UX

Mobile and responsive are the first priority, not a pass at the end. Design the phone first and let it grow. A
screen that only works at 1440px is not finished, and neither is one that technically reflows but is unusable with
a thumb.

- **Build from shadcn.** Search the registry through the `shadcn` MCP server and add through the CLI. If the
  primitive exists there, you do not hand roll it.
- **Base UI, not Radix.** Triggers take `render={<Button/>}`, not `asChild`, and parts have real parent
  requirements: a `DropdownMenuLabel` outside a `DropdownMenuGroup` throws at runtime, not at build. The examples
  on the shadcn site are `new-york-v4` and use Radix conventions this project's `base-nova` style does not share.
- **`src/components/ui/` belongs to the CLI.** Do not edit a component's source to get something props,
  `className` or a small wrapper in `src/components/panel/` would give you. When an edit is genuinely necessary,
  keep it minimal and deliberate: you now own it through every future update.
- **Tokens, not values.** Colour, radius and spacing come from the CSS variables in `src/app/globals.css`. Both
  themes have to hold. Theming is next-themes, `attribute="class"`, dark by default, system respected;
  `theme-toggle.tsx` swaps its icon through the `dark:` CSS variant rather than a `mounted` flag, because the
  usual next-themes mounted pattern trips `react-hooks/set-state-in-effect`.
- **It has to look considered.** No gradient headers, no icon glued to every label, no three shadow depths on one
  screen, no marketing adjectives in product copy. Aim for the calm density of a clinical tool. The data is the
  design.
- **Copy describes the night, not the implementation.** The reader is a patient looking at their own sleep, not a
  reviewer of this codebase. Never put a file name, a folder, a signal label, a data structure or a rendering
  technique in a user facing string. Say what the number is and move on. If a caveat genuinely changes how someone
  should read a number, keep it to one plain sentence; if it does not, cut it.
- **SD cards belong to the import step and nowhere else.** The folder picker and its hints may name the card,
  because that is the thing the reader is being asked to find. Page titles, metadata, the landing page and every
  panel below the import are about therapy data, not about where it came from.
- **Charts are the product.** They must stay legible and operable on a phone: real touch targets, no hover-only
  affordance, no interaction that needs a mouse to discover. See [docs/charts.md](docs/charts.md).
- **Accessibility is part of done.** Real semantics, labelled controls, keyboard reachable, visible focus,
  contrast that survives both themes.

## Product Constraints

**This is health data.** An import identifies a person and describes their treatment. It is special category
personal data under GDPR and Turkey's KVKK, so per user isolation, encryption at rest, and working export and
delete paths are not optional. **No third party may see the contents of an import**, and that includes analytics:
nothing derived from a night, a session, an event or a setting may be attached to an event leaving the browser.

**Analytics is off by default and bounded by `src/instrumentation-client.ts`.** `analyticsEnabled()` in
`src/lib/analytics.ts` is the kill switch: PostHog initialises only when `NEXT_PUBLIC_POSTHOG_ENABLED` is exactly
`true` **and** the build is production, so a development run and the test suite report nothing. `trackEvent` also
returns early on an uninitialised instance, which is what keeps a component test silent. Three init settings are
load bearing rather than preference. `autocapture: false`, because autocapture sends the text of whatever was
clicked and on the panel that text is a date, an AHI or a pressure. `disable_session_recording: true`, because a
replay of the panel is a recording of someone's therapy history, and the flag has to be set here rather than left
to the PostHog project. `before_send: redactCapturedUrls`, because `/panel/therapy?date=2026-08-09` puts a night
in the address bar. The events themselves are the union in `analytics.ts` and nothing calls `posthog.capture`
directly. `posthog.identify` is never called, so no person profile is built and no account is named to PostHog.

**Cookies: essential, plus one for analytics.** Session, locale, theme, `papsee.demo` and `papsee.share` are
strictly necessary; see [docs/therapy-storage.md](docs/therapy-storage.md) for what the last two carry and why
they differ. The PostHog cookie is not strictly necessary, and the privacy policy in `src/lib/contract-seeds.ts`
discloses all of them in both languages, the analytics one under legitimate interest. There is no consent banner.
Adding another non-essential cookie means revisiting that decision rather than assuming it: a banner that consents
to nothing is worse than none, so raise the tension.

**The policy pages are content, not scaffolding.** `/privacy` and `/terms` ship in both languages, seeded from
`src/lib/contract-seeds.ts`, and each renders a plain-language `summary` above its body. `getPublishedContract`
serves the newest row whose `publishedAt` has passed, and the seed upserts on `(type, locale, version)`:
correcting wording means editing the seed in place and re-running `pnpm db:seed-contracts`, while publishing a
revision means a new `version` and `publishedAt` so the old one stays readable. Either way the wording is drafted
for the maintainer to review rather than generated and shipped silently.

**PapSee is not a medical device.** It reports what the device recorded. It does not diagnose, it does not
titrate, and it never tells anyone to change a setting. Keep the copy descriptive.

## Conventions

- TypeScript, strict. Identifiers are English.
- Prettier owns formatting. `.prettierignore` excludes what a CLI writes: `src/components/ui/`,
  `src/lib/db/schema.ts` and `src/app/globals.css`. Leave those in the style the CLI produced.
- Style with Tailwind utility classes. Compose conditional classes through `cn`, never by concatenating strings.
- **Interface icons must come from `lucide-react`. Never hand write an SVG icon.** SVG remains appropriate for
  data visualisations, charts and the established PapSee logo mark, which are not interface icons.
- **A third party's own logo is the one exception, and it comes from `@icons-pack/react-simple-icons`.** Lucide
  dropped brand icons. That package is MIT with no runtime dependencies, wraps the CC0 `simple-icons` set, and is
  marked `sideEffects: false` so a named import ships one icon. Reach for it only for a real brand mark.
- Prefer `next/link`, `next/image` and built-in Next.js patterns. Inside the app, use `Link`, `redirect`,
  `useRouter` and `getPathname` from `@/i18n/navigation` so the locale prefix survives.
- Keep secrets and server-only access out of client bundles.
- Pin a version rather than bypassing pnpm's `minimumReleaseAge` gate. A package published hours ago is exactly
  what that gate is for, and this is health software. The `pg-protocol` override in `pnpm-workspace.yaml` exists
  for that reason and can go whenever `pg` is next bumped deliberately.
- **Never use an em dash**, in code, copy, docs or commit messages.

## Safety

**Do without asking:** read anything, run `format`, `lint`, `knip`, `test` and `build`, and run migrations against
the local docker Postgres.

**Ask first:** adding a dependency (say why, and why nothing installed does the job), changing auth, `src/proxy.ts`
or `next.config.ts`, editing environment files, anything that writes to a database that is not the local docker
one, `git push`, and deploying.

**Never:** copy GPL licensed source into this repository, or send the contents of a PAP import anywhere outside
it.

**This repository is public, so nothing in it identifies anyone.** No real names, email addresses, usernames,
handles, machine names, absolute home directory paths, device serial numbers or local account details, in code,
comments, tests, fixtures, commit messages or documentation. That includes the maintainer: write "the maintainer"
or "the reviewer", never a person's name, and do not record who decided something or who to ask. If a fact only
matters because of who is involved, it does not belong in the repository at all. The one exception is required
attribution, such as a licence header or the SleepyHead credit OSCAR asks for. The repository is published under
the handle `mr-blithe`, which is the only identifier that belongs in a URL here.

## Keeping This File Honest

If a change makes something here or in `docs/` wrong, fix it in the same commit. Documentation loses to code: when
they disagree, the code is the specification and the document is the bug.

Keep it light. This is a standing brief, not a changelog. Record rules and constraints that outlive a single
change, never a log of what was done. A rule that only matters inside one area belongs in that area's file under
`docs/`, not here.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
