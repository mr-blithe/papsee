# Stored imports: the API, the storage model and who may read

Deep dive referenced from `AGENTS.md`. Read this before touching `src/app/api/`, `src/lib/therapy/` or
`src/lib/panel-context.ts`.

Every route reads `getPanelContext()`, answers `401` without a session, and scopes every query by
`context.userId`. Errors are a machine code, `{ "error": "notFound" }`, never a sentence: user facing wording is
the caller's job, in `messages/`, and `apiErrorKey()` in `src/lib/api.ts` is the one map from code to message key.

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
POST   /api/shares               open a share link, returns its token the only time it is readable
DELETE /api/shares/[id]          stop one link
DELETE /api/share-view           leave a shared view, which only drops the reader's own cookie
GET    /share/[token]            redeem a link: a route handler under [locale], not a page
```

## The storage model

- **Nothing reads a night by parsing bytes.** `pap_file` is where an upload lands and the only thing that reads it
  is the commit; every screen reads the parsed form instead: `pap_day` for the summary, `pap_event` for the scored
  events and `pap_channel` for the waveforms. Re-parsing EDF on every day open is what made the panel slow, and it
  also meant opening one night re-derived the whole card's `STR.edf`.
- **A channel is stored the way the device wrote it.** `pap_channel.samples` holds little endian Int16 samples
  with the one linear mapping (`scale`, `offset`) that turns them into physical units, so what is written and what
  is read back are identical by construction rather than by two formulas agreeing. `scale` and `offset` are
  `doublePrecision` on purpose: flow's gain is 0.12, which no float32 holds, and rounding it would break that
  equality. `src/lib/pap/digital.ts` owns the one derivation both sides use. A device that stores a signal in
  **one** byte is widened to Int16 in `edf/signals.ts`, at parse time and nowhere below it, so the stored form has
  one shape whatever the card used. That widening is lossless because `signalScaling` reads the declared physical
  and digital range and never the storage width, and it costs twice the bytes for such a channel. A one byte
  signal is signed exactly when its declared `digitalMin` is negative; that is the only thing that says so, and
  reading it unsigned puts every negative sample 256 too high.
- **Two wire formats, and they carry different things.** `src/lib/pap/bundle.ts` frames `PapFile[]` for the
  upload, which is an opaque list of paths and bytes. `src/lib/pap/day-payload.ts` frames one parsed night for the
  read. Both are hand written because no browser API parses a multipart response. Decode Int16 through a
  `DataView`, never an `Int16Array` view: `pg` gives no alignment guarantee and an odd byte offset throws.

## The commit

- **The commit parses server side, one night per slice.** `advanceCommit` opens with the card level files alone,
  writes a summary only row per night from `STR.edf`, then fills one night at a time until a time budget is spent.
  A year of nights therefore never needs a single request large enough to parse all of it, and the client's own
  parse is never what gets stored, or a crafted request could write any number it liked into a reader's history.
  Every slice is idempotent, so the client retries rather than throwing away a long upload.
- **A night's files are found through the day they were written for.** `pap_file.dayId` is set in the opening
  slice from the filename timestamp, because `DATALOG/20260809/` holds the sessions of the night that _started_ on
  the 8th.
- **The commit consumes the bytes it parses.** A card is uploaded to be read once, so nothing keeps it afterwards:
  the opening slice deletes every file that got no day, which is the card level ones it just parsed into the
  import along with the undated and the replaced, and `fillDay` deletes a night's files in the same transaction
  that writes the night. Transactional because a slice that rolls back has to keep them, or the retry the client
  makes would find a night it can no longer parse. A committed import therefore holds no bytes at all, and the
  cost of that is real: a parser fix cannot be replayed over a night already stored, only over one uploaded again.
- **A night that would not parse is never written as an empty one.** `buildDigitalDay` answers a throwing loader
  with no sessions, and storing that would report a night somebody slept through as no usage and no AHI. So
  `fillDay` keeps whatever the card itself already said about that night and drops the row when the card said
  nothing, `advanceCommit` answers `unreadableCard` when a card loses every night that way, and the dates travel
  back to the import screen rather than ending at a success message.
- **Re-importing a night replaces it.** `pap_day` is unique on `(userId, date)`; every date the new card covers is
  deleted once, up front, in the opening slice, and the old day's events, channels and bytes go with it. An import
  left with no days is deleted there too rather than kept as orphaned bytes, so an abandoned commit cannot strand
  them.
- **Every night is validated by the row it came from.** `GET /api/days/[date]` builds its `ETag` from `pap_day.id`
  and `filled_at`, never from what the night looks like: the browser cache is not partitioned by account, so two
  readers on one machine collide on any validator a summary only night can produce, and a `304` would then hand
  one of them the other's night.

## The export

**The export builds tables once and serves them two ways.** `src/lib/therapy/export-tables.ts` turns stored days
into `{ name, columns, rows }`, where the name and the columns are message keys rather than sentences, so the JSON
and the six CSV tables in `EXPORT_DOWNLOADS` cannot drift apart. The route resolves those keys against the
`locale` search param, which is how a route outside `[locale]` gets a language at all. Two rules are load bearing
and both are pinned by a test: a CSV opens with a UTF-8 byte order mark, without which Excel reads it in the
system code page and mangles every Turkish letter, and **a table name may not exceed 31 characters or hold
`[ ] / \ : * ?`**, which [Excel rejects as a sheet name](https://support.microsoft.com/en-us/excel/rename-a-worksheet).
Nothing writes a workbook yet, so that second rule is holding the names inside what one would accept rather than
fixing a bug that exists today; it is cheap, and it is what stops a long translation from having to be renamed
later.

## Who is reading, and under what right

- **`PanelContext` is a three way union, and `view` is what decides everything.** `account`, `demo` or `shared`,
  in `src/lib/panel-context.ts`. A mutating route asks `context.view !== 'account'` and answers with
  `readOnlyErrorCode(context.view)`; a reading route asks `context.view === 'demo'` to decide between the
  generator and the database. Never write a guard as "not demo": that is the shape this union replaced, and under
  it every share reader would have been able to write to the account they were only shown.
- **Three cookies can sit in one browser, so the order they are read in is a safety property.**
  `getPanelContext()` takes demo first, then a share, then the reader's own session. Demo first because synthetic
  nights must never be overtaken by somebody's real ones, and the redeem route deletes that cookie so the two
  cannot fight. A share ahead of the session because a reader who has an account of their own and follows a link
  came to read what was shared, not their own history. Every combination of the three, including a stale or forged
  one, is enumerated in `panel-context.test.ts`; add the row before changing the order.

### Demo mode

- **Demo mode is read only on the server, not just in the UI.** `getPanelContext()` reports it from a cookie,
  every mutating route answers `403 readOnlyDemo`, and the two read routes serve `src/lib/therapy/demo.ts` instead
  of the database. The generator is the same `writeSyntheticCard` the tests use and it travels the same day
  payload a stored night does, so nothing renders a special demo shape.
- **The panel chrome reads the demo cookie itself, through `useDemoMode`.** The banner, the import affordances and
  the settings item all sit in `panel/layout.tsx`, and a layout keeps whatever it first rendered: navigating
  between two panel routes re-renders the page but serves the shared shell from the client router cache, so a flag
  passed down from the layout went stale and the banner said nothing while the page below it was already serving
  the example patient. A `template.tsx` does not help, it is kept from that cache too. That is why `papsee.demo`
  is **not** `httpOnly`: it carries no secret, `POST /api/demo` sets it for anyone who asks, and being readable is
  what lets the shell agree with the server on every navigation and whenever the tab regains focus. The server
  value is still passed in, as the first paint before hydration. Anything else in the shell that has to track a
  cookie needs the same treatment.

### Share links

- **A share link is a credential, so its cookie is the opposite of the demo one.** `papsee.share` is `httpOnly`
  and holds the token itself; nothing in the panel reads it, the shell learns about a shared view from the server,
  and entering one is always a full document load through `/share/[token]`, so it cannot go stale behind the
  router cache the way a demo flag did. Its `expires` matches the link, so the browser drops it when the link
  dies.
- **Only the hash of a link is stored.** `therapy_share.token_hash` is the SHA-256 of a 32 byte token from
  `randomBytes`, minted and hashed in `src/lib/therapy/share-token.server.ts`. A single fast hash is right here
  where bcrypt would not be: there are 256 bits of entropy and nothing to slow down. The consequence is that a
  link cannot be shown twice, which is why `POST /api/shares` returns the token and no read route ever does.
- **What a link opens is the nights and nothing else.** The day index and a night, read only, on screen. Three
  refusals are deliberate and each one is a `403 notInSharedView` rather than an empty answer: `GET /api/export`,
  because taking the whole history away as a file is the owner's alone; `GET /api/profile`, and with it the
  profile the overview page would otherwise pass down, because a name, a date of birth, a height, a weight and a
  diagnosis were never part of what was shared, so the AHI trend simply loses its diagnosis reference line; and
  every mutating route, as `403 readOnlyShare`. `requireAccount` sends a shared view to the overview, which is
  what keeps onboarding, import and settings out of reach, and `requireStoredDays` turns a link to an account with
  no nights into the `/share` page rather than putting a reader in front of the import screen. Anything added to
  the panel that reads more than the nights has to decide where it stands here. Lengths run from 15 minutes to
  three days, `SHARE_DURATION_MINUTES` is the whole ladder, and a length outside it is refused rather than
  clamped.
