# PapSee

[![CI](https://github.com/mr-blithe/papsee/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mr-blithe/papsee/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/mr-blithe/papsee/graph/badge.svg?token=OUV7INYX7X)](https://codecov.io/github/mr-blithe/papsee)

Free and open source PAP therapy tracking in the browser.

PapSee reads the data on your PAP device's SD card and turns it into a permanent, account-linked history. Review
flow, events, AHI, leak, pressure, usage and long-term trends from your phone, tablet or computer.

**[www.papsee.com](https://www.papsee.com)** is the hosted instance. Open the example patient without an account,
sign up to use it directly, or [self host it](#self-hosting) to keep the application and its data on infrastructure
you control.

## What it solves

Uploading the SD card is only the first step. The real problem is being able to view, keep and share the data after
the card is removed.

- **Your therapy history is available anywhere.** After an import, you do not need the SD card, PAP device, OSCAR or
  even the same computer to review a night. Sign in from a phone, tablet or another computer.
- **Sharing does not require hardware or screenshots.** Generate a read-only viewer link and send it to a doctor or
  clinic. They can review the nights in a browser without taking your PAP device or SD card with them.
- **Your history is not tied to one manufacturer.** If you move to another device that PapSee supports, the nights
  imported from the previous device remain in the same history.
- **Your data is no longer stored in only one fragile place.** If the PAP device fails, the SD card is corrupted, a
  computer is formatted or OSCAR is removed, the copy already imported into PapSee remains available.
- **You can leave without losing access to your own data.** Export the stored history as JSON or CSV whenever you
  need it.
- **You control where the data lives.** Use the hosted instance for convenience or self host the same application on
  infrastructure you control.

## How it differs

- **OSCAR** is an excellent, free desktop application and remains the reference for detailed PAP analysis. PapSee is
  account-based and runs in the browser, so the computer used for the import does not have to be turned on whenever
  you want to review or share the data.
- **Paid cloud services** provide browser access and sharing, but may place longer history and other features behind
  a subscription. PapSee is free and open source, has no paid history tier, and can be self hosted.
- **Manufacturer applications such as myAir** are tied to compatible devices from that manufacturer and focus on
  summary information.

## What it does

Upload what your machine wrote to the card. PapSee stores and presents it as:

- **The night itself.** Flow waveform, pressure, leak, respiration rate, tidal volume, minute ventilation, and every
  event the device scored, on charts you can zoom and pan with a thumb.
- **The numbers behind it.** AHI traced across the night, event indices, time at pressure, usage, session times, and
  the settings the device was running.
- **History.** A day strip and trends across nights, so a bad night is something you can put in context instead of
  something you stare at alone.
- **Sharing.** Revocable viewer links for a doctor, clinic or anyone else you choose.
- **Export.** JSON and CSV copies of the stored history.
- **An example patient.** Click through every screen with generated data, without signing up or uploading anything.

PapSee is in beta. Expect bugs, rough edges and changing screens.

## Device coverage

The word "support" is doing too much work in most tools, so here it is split three ways.

| Level                    | Devices                                                                                                       | What it means                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Verified**             | ResMed AirSense 11                                                                                            | Read back from a real card of that family, front to back                                         |
| **Supported**            | ResMed AirSense 10, AirCurve 10 and 11, ResMed S9, Löwenstein prisma SMART and SOFT                           | The format is implemented and tested against synthetic cards, but no real card has been seen yet |
| **Recognised, not read** | Philips Respironics, Fisher & Paykel, Löwenstein prisma LINE, Weinmann, DeVilbiss, Resvent, BMC, vREM, Yuwell | PapSee names the card and tells you it cannot read it, rather than showing you an empty night    |

Bilevel, ASV and iVAPS modes import, but PapSee's stored shape cannot represent all of their settings yet, so treat
those as partial whatever the family.

If your machine is in the third row and you would be willing to share a card, that is the single thing that would
move it up. Every brand is blocked on real bytes, not on effort: the Löwenstein prisma reader was written from the format and
from OSCAR's source, and has never met a real prisma card.

## Roadmap

- More PAP device support, in rough order of how cheap and how wanted each is: Philips Respironics, BMC (also sold
  as React Health Luna and Respirox), Fisher & Paykel SleepStyle.
- Mobile app
- Syncing health data from Apple Health, Samsung Health
- AI integration with MCP servers

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

That brings up Postgres 17, applies the migrations, seeds the privacy policy and terms, and serves the app on
<http://localhost:3000>. Create an account and import a card.

Things worth knowing:

- `NEXT_PUBLIC_*` values are compiled into the browser bundle, so changing one means
  `docker compose up -d --build` rather than a restart.
- `SITE_DOMAIN` is what canonical links, `robots.txt` and the sitemap are built from. Leave it empty for localhost.
- Analytics is off unless `NEXT_PUBLIC_POSTHOG_ENABLED` is exactly `true`, and off in any non-production build
  regardless. A self hosted instance reports nothing to anyone by default.
- Google sign-in, the Turnstile challenge on sign-up, and the contact form are each optional. Leave their variables
  empty and the features are simply not there. Everything else works.
- Your therapy data lives in the `papsee_postgres-data` Docker volume. Back it up like anything else you care about.

### From the published images

Every release publishes two images to the GitHub Container Registry, for `linux/amd64` and `linux/arm64`, so you can
run a version without cloning anything. They come as a pair and the order matters: the app image carries no migration
tooling, so the database is brought to the release's schema first.

```bash
docker run --rm --network host \
  -e DATABASE_URL=postgres://papsee:papsee@localhost:5432/papsee \
  ghcr.io/mr-blithe/papsee-migrate:latest

docker run -d --network host --env-file .env ghcr.io/mr-blithe/papsee:latest
```

Tags follow the release: `0.1.0` pins one, `0.1` and `0` follow patches and minors, `latest` is whatever came out
last. To use them with the compose file above, replace each service's `build:` block with the matching `image:`.

One thing a published image cannot do for you: `NEXT_PUBLIC_*` values are compiled in, so these images carry the
ones the release was built with. Analytics is off and stays off, `NEXT_PUBLIC_SOURCE_URL` points at this repository,
and **the Turnstile challenge on sign-up is not in them**, because a site key belongs to whoever runs the instance.
If you want that challenge, or your own source link on a fork, build the image yourself with those build arguments.

### Without Docker

You need Node 24, pnpm 11 and a Postgres 17 of your own.

```bash
pnpm install
cp .env.example .env.local          # fill DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:migrate                     # apply drizzle/
pnpm db:seed-contracts              # privacy policy and terms, otherwise those pages 404
pnpm build
pnpm start                          # localhost:3000
```

Use `pnpm dev` instead of `build` and `start` while you are working on the code.

If your `DATABASE_URL` goes through a connection pooler, on a provider like Neon or on a PgBouncer of your own, also
set `DATABASE_URL_UNPOOLED` to the same database's direct endpoint. `pnpm db:migrate` reads that one, because schema
migrations need session state transaction pooling does not keep. A Postgres you connect to directly needs only
`DATABASE_URL`, so leave the second one empty.

### Administration

Register an account the usual way, then promote it:

```bash
pnpm db:promote-admin someone@example.com
docker compose run --rm migrate pnpm db:promote-admin someone@example.com   # the Docker path
```

## Prior art

- [OSCAR](https://gitlab.com/CrimsonNape/OSCAR-code), GPL v3, itself derived from Mark Watkins' SleepyHead. The
  reference for what a device records and which numbers matter, and still the better tool if you have a desktop in
  front of you.

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
