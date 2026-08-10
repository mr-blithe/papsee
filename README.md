# PapSee

Your PAP therapy data, in the browser.

PapSee reads what your PAP device wrote to its SD card and gives the night back to you: the flow waveform, every
scored event, AHI, leak, pressure, usage, and the history and trends across nights. On a phone, on a laptop, on
whatever you happen to be holding.

**[www.papsee.com](https://www.papsee.com)** is the hosted instance. Open the example patient there to click through
every screen without an account, or sign up use it directly. If you would rather your therapy
data never left your own machine, [self host it](#self-hosting) instead: same application, one command.

## Why this exists

I was diagnosed with sleep apnea not long ago and did what most people do: put the SD card into OSCAR and started learning. OSCAR is
excellent and I still recommend it. Two things never worked for me, though. I could not look at a night from my
phone, and when I wanted to show a few nights to my doctor I had nothing to hand over but screenshots.

Then I found a handful of paid tools that solved exactly that, at fifteen to twenty dollars a month if you wanted to
keep more than thirty days of history. Paying rent on a recording of my own breathing did not sit right, so I built
this instead: for myself first, then for anyone else in the same position.

What I want back is feedback. Try it with your own card and tell me where it is wrong, confusing, or missing
something you would expect from OSCAR. Especially if your machine is not an AirSense 11, because that is the one
thing I cannot test myself. And if your answer is "I would never upload this data to a website", that is a
completely fair position, it is why self hosting exists, and I would still like to know how common it is.

## What it does

You upload what your machine wrote to the card. PapSee parses it and gives the night back:

- **The night itself.** Flow waveform, pressure, leak, respiration rate, tidal volume, minute ventilation, and every
  event the device scored, on charts you can zoom and pan with a thumb.
- **The numbers behind it.** AHI traced across the night, event indices, time at pressure, usage, session times, and
  the settings the device was running.
- **History.** A day strip and trends across nights, so a bad night is something you can put in context instead of
  something you stare at alone.
- **Export.** JSON and CSV, so there is something to actually send your doctor.
- **An example patient.** Click through every screen with generated data, without signing up or uploading anything.
- **English and Turkish**, throughout.

## Where it honestly stands

PapSee is in beta and the device coverage is narrower than the ambition:

- **ResMed only.** AirSense 11 AutoSet is the one family verified against a real card, because it is the one I own.
- **S9, AirSense 10 and AirCurve** are implemented from the format, OSCAR's source and synthetic fixtures, but no
  real card from those families has been through them. Bilevel, ASV and iVAPS import, but not every setting is
  represented yet, and the app says so rather than quietly showing you a number.
- **Philips, Fisher & Paykel, Löwenstein, DeVilbiss, Resvent and BMC** cards are recognised and refused with a clear
  "not supported yet". An unreadable card must never look like a night you slept badly.

This is exactly where help is worth the most. If you have a card from anything other than an AirSense 11, importing
it and telling me what broke is the single most useful thing you can do.

## Self hosting

Everything runs on your own machine: the app, the database and the parsing. Nothing leaves it.

### With Docker

You need Docker with the Compose plugin.

```bash
git clone https://github.com/mr-blithe/papsee.git
cd papsee
cp .env.example .env

# Put a secret of at least 32 characters in BETTER_AUTH_SECRET, for example:
#   openssl rand -base64 32
# Set SITE_DOMAIN to the host you will reach this at, without a scheme, if it is not localhost.

docker compose up -d --build
```

That brings up Postgres 18, applies the migrations, seeds the privacy policy and terms, and serves the app on
<http://localhost:3000>. Create an account and import a card.

Things worth knowing:

- `NEXT_PUBLIC_*` values are compiled into the browser bundle, so changing one means
  `docker compose up -d --build` rather than a restart.
- `SITE_DOMAIN` is what canonical links, `robots.txt` and the sitemap are built from. Leave it empty for localhost.
- Analytics is off unless `NEXT_PUBLIC_POSTHOG_ENABLED` is exactly `true`, and off in any non-production build
  regardless. A self hosted instance reports nothing to anyone by default.
- Google sign-in, the Turnstile challenge on sign-up, and the contact form are each optional. Leave their variables
  empty and the features are simply not there. Everything else works.
- Your therapy data lives in the `papsee-db` Docker volume. Back it up like anything else you care about.

### Without Docker

You need Node 24, pnpm 11 and a Postgres 18 of your own.

```bash
pnpm install
cp .env.example .env.local          # fill DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:migrate                     # apply drizzle/
pnpm db:seed-contracts              # privacy policy and terms, otherwise those pages 404
pnpm build
pnpm start                          # localhost:3000
```

Use `pnpm dev` instead of `build` and `start` while you are working on the code.

## Contributing

Contributions are welcome, and a bug report from a device I cannot test is worth as much as a patch.
[`CONTRIBUTING.md`](CONTRIBUTING.md) has the detail. The short version:

1. Read [`AGENTS.md`](AGENTS.md). It is written for AI assistants but it is the real engineering brief for this
   repository: the rules the parsing layer obeys, why device timestamps never touch local time, and what the panel
   is allowed to assume.
2. Set up as in **Without Docker** above and get the tests green before you change anything.
3. Work test first. A parser bug starts with the test that reproduces it, using the bytes that triggered it.
4. Before you open a pull request, run all five, in this order:

   ```bash
   pnpm format
   pnpm lint
   pnpm knip
   pnpm test
   pnpm build
   ```

Do not send therapy data. Not in an issue, not in a test fixture, not in a pull request. A card identifies a person.
If a bug needs real bytes, say so in the issue and we will work out how to reproduce it without publishing yours.

## Translations

PapSee ships **English** and **Turkish**, both complete. Every user facing string lives in `messages/`, and the test
suite fails on a missing key, a blank message or a placeholder that does not match its English original, so neither
language can quietly fall behind.

To add a third:

1. Copy `messages/en.json` to `messages/<locale>.json` and translate every value. Keys stay as they are.
2. Add the locale to `routing.locales` in `src/i18n/routing.ts`.
3. Import the new catalog in `src/i18n/messages.test.ts` and add it to the `catalogs` map. The suite checks that
   every configured locale has one.
4. Add the date-fns locale for the calendar in `src/components/panel/date-field.tsx`.
5. Write the privacy policy and terms for that language in `src/lib/contract-seeds.ts`, then run
   `pnpm db:seed-contracts`. Without them, `/<locale>/privacy` and `/<locale>/terms` return 404.
6. Run `pnpm test`, which will tell you exactly which keys you are still missing.

Two things the catalogs care about. Write the language in its own alphabet, in full, accents and all: `Sızıntı`,
never `Sizinti`. And translate the interface, not the device: therapy mode names, `On`/`Off`/`Auto` and clinical
abbreviations such as AHI, EPR and CPAP stay as the machine reports them, in every language.

## Stack

Next.js App Router, React, TypeScript in strict mode, Tailwind, shadcn/ui on Base UI primitives, uPlot for the
charts, next-intl, next-themes, Better Auth over Drizzle and Postgres, Vitest, pnpm. Versions live in
`package.json`.

`src/lib/pap/` is a standalone import library with no React, no DOM and no Node built-ins in it. It takes
`{ path, data: ArrayBuffer }[]` and returns a parsed import, which is why the same code serves the browser and the
server side commit. If you only care about reading ResMed cards and not about this application, that directory is
the part worth stealing.

## Prior art

- [OSCAR](https://gitlab.com/CrimsonNape/OSCAR-code), GPL v3, itself derived from Mark Watkins' SleepyHead. The
  reference for what a device records and which numbers matter, and still the better tool if you have a desktop in
  front of you.
- [oscar-sql](https://gitlab.com/CrimsonNape/oscar-sql), the OSCAR line that moved its storage to a database.

PapSee reads OSCAR to understand the devices and implements from the data itself. No OSCAR source is copied into
this repository and none should be: it is GPL v3, and its authors ask derivatives to credit SleepyHead by name.
Every rule in `src/lib/pap/` was verified against a real card or against the format, and is pinned by a test against
a synthetic one.

## License

[GNU Affero General Public License v3.0](LICENSE).

You can read it, run it, change it and host it. If you host a modified version and let other people use it over a
network, the AGPL asks you to offer them your source too. That is deliberate: the point of this project is that
nobody has to take a therapy report on trust.

## A necessary disclaimer

PapSee is not a medical device and gives no medical advice. It shows you what your machine recorded. It does not
diagnose, it does not titrate, and it will never tell you to change a setting. Decisions about your therapy belong
with the clinician who prescribed it.
