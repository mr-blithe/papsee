## What changed and why

<!-- One or two paragraphs. Link the issue if there is one. -->

## How it was verified

<!-- Which test pins this, and what you saw fail before the fix. For anything visual, which screens you drove and
     at which widths. -->

## Checklist

- [ ] No therapy data anywhere in this branch: no card, no EDF file, no export, no real patient bytes in a fixture.
- [ ] Every new user facing string is in both `messages/en.json` and `messages/tr.json`, none inline in TS or TSX.
- [ ] A new test was seen failing before the change made it pass.
- [ ] `pnpm format`, `pnpm lint`, `pnpm knip`, `pnpm test` and `pnpm build` all pass locally.
- [ ] `AGENTS.md` updated if this change made anything in it wrong.
- [ ] No em dash, and no comment that narrates what the next line does.
