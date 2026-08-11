# Contributing to PapSee

Thanks for looking. PapSee reads medical data for people who are trying to understand their own treatment, so the
bar here is correctness before features. A wrong number is worse than a missing one.

## Never send therapy data

An import identifies a person and describes their treatment. Do not attach a card, an EDF file, a session, an
export or a screenshot of your own panel to an issue, a pull request, a test fixture or a message. This applies to
your data and to anyone else's.

If a bug only reproduces on real bytes, open the issue describing what you see and we will work out how to build a
synthetic file that triggers the same thing. `src/lib/pap/synthetic/` exists for exactly this.

## The most useful thing you can do

PapSee has been verified against one real card, a ResMed AirSense 11 AutoSet. Everything else, including the whole
Löwenstein prisma reader, is implemented from the format and from OSCAR's source, and tested only against synthetic
files.

So: **import your card and tell us what happened.** An S9, an AirSense 10, an AirCurve, a Löwenstein prisma SMART or
SOFT, a bilevel or ASV machine, or one of the brands that is detected but refused. Whether it worked, where a number looked wrong, what the app claimed
it could not read. Use the device report issue template. That feedback is not a smaller contribution than code, it
is the thing code cannot substitute for.

Other things worth doing:

- A bug report with steps, on any screen.
- A translation, or a fix to one. See the Translations section of the [README](README.md).
- Accessibility problems: anything you cannot reach with a keyboard, anything a screen reader garbles, anything that
  fails on a phone.
- Copy that is confusing, patronising or too technical for someone reading their own sleep data.

## Getting set up

Node 24, pnpm 11, and a Postgres 17. Docker Compose gets you the database in one command.

```bash
git clone https://github.com/mr-blithe/papsee.git
cd papsee
pnpm install
cp .env.example .env.local        # fill DATABASE_URL and BETTER_AUTH_SECRET

docker compose up -d postgres     # or point DATABASE_URL at a Postgres of your own

pnpm db:migrate
pnpm db:seed-contracts            # privacy policy and terms, otherwise those pages 404
pnpm dev
```

Confirm the suite is green before you change anything:

```bash
pnpm test
```

## Read AGENTS.md first

[`AGENTS.md`](AGENTS.md) is written as a brief for AI assistants, but it is the engineering documentation for this
repository and it applies to humans identically. It exists because the domain is full of things that are wrong in
ways that do not crash: a therapy day runs noon to noon, device timestamps carry no time zone and must never touch
local time, signal labels are matched by longest prefix because the device localises its own, and ResMed writes a
record count of zero and means something else.

It holds the rules that apply everywhere. The areas dense enough to have their own file are linked from it and
live in [`docs/`](docs/): the import library and its device rules, stored imports and who may read them, auth and
the admin panel, deployment and self hosting, and the charts.

Read `AGENTS.md`, then the file covering the area you are touching. If either contradicts the code, the code is
right and the document is the bug: fix it in the same change.

## How the work goes

Test first. Write the failing test, then the smallest change that passes it, then refactor.

- **Prove the test can fail.** Break the rule it claims to pin, watch it go red, put the code back. A test that has
  never been seen failing is an assumption.
- **Name the defect a test would catch before you write it.** Coverage is a byproduct, never the goal.
- **A parser bug starts with the test that reproduces it.** Build the bytes with the synthetic card writer.
- **Test our decisions, not the library's.** A test that mocks a dependency and asserts we passed it the arguments
  we just passed proves nothing.
- **No user facing string in a `.ts` or `.tsx` file, ever.** Every message goes in `messages/en.json` and
  `messages/tr.json`, in the same commit. A key missing from either catalog fails the build.
- **No code comments** except a genuinely non-obvious constraint the code cannot express, or a required directive.
  Naming and structure do the explaining.
- **Never use an em dash**, in code, copy, docs or commit messages.

## Before you open a pull request

Run all five, in this order. CI runs the same set and will fail on anything you skip.

```bash
pnpm format         # Prettier, writes
pnpm lint           # ESLint
pnpm knip           # unused files, exports and dependencies
pnpm test           # Vitest, single run
pnpm build          # production build; this is the real type check
```

There is no separate typecheck script. A build that passes is the type check.

Commit messages and pull request descriptions are English and imperative, and say what changed and why. Keep the
diff to the task: if you noticed something else, mention it rather than fixing it in the same branch.

## Things to check with us first

Open an issue before you start on any of these, so nobody wastes an afternoon:

- Adding a dependency. Say why, and why nothing already installed does the job.
- Anything touching authentication, `src/proxy.ts` or `next.config.ts`.
- Another device brand. It belongs beside `resmed/` and `lowenstein/` as an entry in `src/lib/pap/loaders.ts`, behind
  the same `PapImport` shape, and there is prior research on what each brand would cost that is worth asking for
  before you begin.
- Anything that changes what leaves the browser. No third party may see the contents of an import, analytics
  included.

## OSCAR is GPL v3

Read OSCAR to learn what a device writes and which numbers matter. Do not copy its source and do not port a file of
it line by line. Everything in `src/lib/pap/` was implemented from the data and is pinned by a test, and that is the
bar for the next one.

## License

PapSee is licensed under the [GNU AGPL v3](LICENSE). By contributing you agree that your contribution is licensed
under the same terms. There is no separate contributor licence agreement.

## Conduct

The [code of conduct](CODE_OF_CONDUCT.md) applies everywhere this project is discussed. People here are dealing with
a chronic condition and reading their own medical data. Be decent.
