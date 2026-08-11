# Deployment and self hosting

Deep dive referenced from `AGENTS.md`. Read this before touching `next.config.ts`, `Dockerfile`, `compose.yaml`,
`vercel.json`, `drizzle.config.ts` or the release workflow. Deploying, and anything that writes to a database that
is not the local docker one, needs a maintainer's go ahead first.

Vercel for the application, Neon for Postgres. Local development stays on your own local Postgres; nothing here
changes that.

- **The data stays in the EU.** The Neon project lives in `aws-eu-central-1`, AWS Europe (Frankfurt), and
  `vercel.json` pins functions to `fra1`, the Vercel region in the same city. This is a requirement, not a
  performance tuning choice: an import is special category personal data under GDPR and KVKK. Neon's London region
  `aws-eu-west-2` is **not** an EU region and must not be used for this.
- **`DATABASE_URL` is what the application runs on, and in production it is the pooled endpoint**, the hostname
  with `-pooler` in it. `src/lib/db/index.ts` and `scripts/seed-contracts.ts` read it and nothing else. The
  application is what forces the choice: a Vercel function opens a connection per invocation, which
  [Neon lists](https://neon.com/docs/connect/connection-pooling) as the classic way to exhaust a direct endpoint,
  where a 0.25 CU compute allows 104 connections with seven reserved. The pooled endpoint takes 10,000.
- **`DATABASE_URL_UNPOOLED` is the direct endpoint, and Drizzle Kit is the only thing that reads it.**
  `drizzle.config.ts` prefers it and falls back to `DATABASE_URL` when it is empty or unset, because the same Neon
  page advises against schema migrations over PgBouncer: a tool may need session state transaction pooling does
  not keep, and a migration that fails with something that looks unrelated is the first thing to suspect. A
  Postgres reached directly has no pooler to route around, so a local checkout, the docker compose and CI all
  leave it unset and run on the one variable. Seeding stays on `DATABASE_URL` because it is ordinary inserts,
  which transaction pooling handles.
- **No client side pool on top of the pooled endpoint.** Neon runs PgBouncer already, and stacking a second pool
  on it causes connection conflicts.
- **`pg` is the right driver here and no Neon specific package is needed.** `@neondatabase/serverless` exists for
  edge runtimes that cannot open a TCP socket. This app runs on the Node runtime, where Neon documents `pg` as the
  standard choice, so the driver already in `package.json` is the one to keep.
- **A Vercel function may not receive or return more than 4.5 MB**, it is a platform limit no config raises, and
  the caller sees a platform error rather than anything the handler wrote:
  [functions/limitations](https://vercel.com/docs/functions/limitations#request-body-size). A single night of
  waveforms is larger than that, which is why an import is uploaded in batches under `MAX_REQUEST_BODY_BYTES` and
  why `GET /api/days/[date]` returns a `ReadableStream` that pulls one stored file at a time. Buffering that
  response into a single body would work on every card small enough to test with and fail on a real one.

## Self hosting

The hosted instance is not the only deployment any more. `Dockerfile` and `compose.yaml` are a supported path and
the README documents them, so a change that only works on Vercel is a broken change.

- **The image is a `output: 'standalone'` build.** `next.config.ts` sets it everywhere except on Vercel, the
  runtime stage copies `.next/standalone` and `.next/static` and nothing else, and no `node_modules` is installed
  there. Anything read from disk at runtime that the tracer cannot see will be missing from the image and present
  everywhere else. Vercel is excluded because it packages the build itself and because asking for standalone there
  fails the deploy outright, on an open Next.js bug the config links to: keep that condition until the bug is
  closed.
- **Migrating and seeding happen from the `migrate` stage, not the runtime one.** Drizzle Kit and tsx are
  devDependencies. `compose.yaml` runs that stage to completion before the app starts.
- **A release publishes both stages, and they are one unit.** `.github/workflows/release.yml` fires on a `v*` tag,
  refuses one that disagrees with `package.json`, and pushes `ghcr.io/mr-blithe/papsee` and
  `ghcr.io/mr-blithe/papsee-migrate` under the same tags. Publishing the app image alone would ship something
  nobody can migrate a database with, so a change to either stage has to keep both buildable. The app image also
  freezes every `NEXT_PUBLIC_*` it was built with, which is why the workflow passes only the source offer and
  leaves the rest empty: anything added there is baked into what strangers run.
- **`SITE_DOMAIN` names the host, without a scheme.** `getSiteUrl()` prefers it over
  `VERCEL_PROJECT_PRODUCTION_URL`, which is how an image built by a stranger learns where it is served from.
  Vercel keeps working untouched because the variable is simply unset there.
- **`robots.ts` and `sitemap.ts` are `force-dynamic` for that reason.** Next
  [caches both by default](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), which
  bakes in whatever domain the build machine knew. On Vercel that is right by accident; for an image built before
  anyone chose a domain it is `localhost:3000` in a published sitemap.
- **`NEXT_PUBLIC_*` values are inlined at build time**, so the container passes them as build args and changing
  one needs a rebuild rather than a restart. Nothing may start reading a `NEXT_PUBLIC_*` variable expecting it to
  be configurable at run time.
- **`NEXT_PUBLIC_SOURCE_URL` is the AGPL source offer**, rendered by both footers and the landing page and hidden
  when unset. A fork that changes the code and serves it over a network is asked to point it at its own source,
  not at this repository.
