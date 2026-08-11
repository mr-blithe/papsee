# The PAP import library

Deep dive referenced from `AGENTS.md`. Read this before touching `src/lib/pap/` or adding a device brand.

`src/lib/pap/` reads a PAP device SD card. The parsing modules are framework free: no React, no DOM, no Node
built-ins. One marked exception may reach for Node: `*.server.ts`. The input is always
`{ path, data: ArrayBuffer }[]`, so the same code serves the browser folder picker and the server side commit.

```text
edf/       Generic EDF and EDF+ reader. Nothing brand specific, including the sample width rule.
loaders.ts The brand seam: one CardLoader per readable brand, keyed by CardBrand. A brand with no
           entry is detected and refused rather than parsed by somebody else's reader.
resmed/    ResMed loader: Identification.json and .tgt, CurrentSettings.json, STR.edf, DATALOG.
lowenstein/ Löwenstein prisma SMART and SOFT: config.pscfg, WMEDF signals, XML events and settings.
summary.ts The night summary a card without one still owes: median, 95th and maximum per channel.
detect.ts  Card brand fingerprints, from paths alone. Runs before anything is parsed.
device-time.ts Every clock reading a device wrote, and the therapy day key. See Time in AGENTS.md.
stats.ts   Event indices, the AHI traced across a night, time at pressure, duration helpers.
decimate.ts Min/max envelope decimation for the charts.
digital.ts The stored form of a channel, and the one derivation back to physical units.
day-payload.ts The wire format one parsed night travels in, both from the database and from demo.
index.ts   readCardMetadata + buildDigitalDay, composed into importPapData(files, cardPaths) => PapImport.
sources.ts Browser adapters for the example data endpoint and a folder picker.
```

## Device rules

Things this code knows that are easy to get wrong, all verified against a real card or against OSCAR's source.
Each one is a silent wrong number if it regresses, not a crash, so each one has a test.

- ResMed writes `nrec` as 0 or -1 in EDF headers. The real record count comes from the file size.
- **Signal labels and event annotations are matched by longest prefix, case-insensitively**, never by equality.
  The device is inconsistent about case, and it localises its own labels: leak is also `Sızıntı`, `Fuites` and
  `Leck`. Longest wins because `Flow` is a prefix of `FlowLim.2s`.
- The S9 family writes short spaced labels (`Mask Dur`, `Leak Med`, `RR 95`) where the AirSense writes dotted ones
  (`Duration`, `Leak.50`, `RespRate.95`). Both belong in every lookup.
- AirSense 11 (model number >= 39000) shifts most setting enums by one against AirSense 10, `S.Mask` by two, and
  remaps therapy modes through a nine entry table. All of that lives in `resmed/enums.ts` and nowhere else.
- Which pressure signal is real depends on the mode: `S.C.*` CPAP, `S.A.*` or `S.AS.*` AutoSet, `S.AFH.*` AutoSet
  for Her. A mode we cannot represent reports null pressures rather than the signals the device left behind.
- The device truncates its own indices to one decimal, it does not round. `truncateToTenth` matches it.
- A ResMed day runs noon to noon, and `MaskOn`/`MaskOff` are minutes since that noon. `papDayKey` is that rule.
- **Every brand is converted to one set of units, and the panel labels them without asking.** Flow and leak in
  L/min, every pressure in cmH2O, tidal volume in mL. ResMed writes leak and flow in L/s and tidal volume in L,
  and `resmed/channels.ts` is the only place that conversion happens; Löwenstein writes hectopascals and litres
  per minute, and `lowenstein/sessions.ts` reads the unit out of the signal header rather than assuming one. A
  brand that stores a channel in units of its own converts there, not above it: `L/min` is written into the
  statistics panel, the export columns and `LARGE_LEAK_THRESHOLD`, so a channel that arrives in anything else is
  silently off by whatever the factor was.
- `-1` is the no data marker. A channel that is entirely `-1` (an absent oximeter) is dropped rather than plotted.

Raw ResMed signal labels appear only in `resmed/channels.ts` and `resmed/str.ts`. Everything above them speaks in
`ChannelId`.

## Adding a brand

`detect.ts` names the brands nothing reads rather than letting an unreadable card look like an empty night.
**Never let an unsupported card fall through as a blank panel**: a patient cannot tell that from a good night. A
brand belongs beside `resmed/` and `lowenstein/` as an entry in `loaders.ts`, behind the same `PapImport` shape,
and it does not get to widen that shape for itself. Two consequences of the seam are load bearing:

- **`isImportable` and `isCardLevel` belong to the loader, not to a global list.** A shared whitelist would make
  every ResMed import upload any stray `.xml` in the picked folder, and `sources.ts` therefore detects the brand
  from the path listing before it reads a single byte.
- **`headBytes` is a number, not a flag.** A brand that can date its files from their paths declares `0` and the
  commit reads no bytes to place them; Löwenstein declares 256 because its day directory naming is unknown and the
  therapy day can only come from the WMEDF header clock. ResMed's opening slice is byte identical to what it
  always was.

`DEVICE-COVERAGE.md` records what each brand would cost, what is deliberately left undone and why. It is
gitignored and lives only in the maintainer's working copy, so read it before touching device support if you have
it, and say so rather than guessing if you do not.

## Testing this layer

This is where the real rules live, so it is where tests matter most, and it is pure functions over byte arrays, so
it is cheap to test properly. `src/lib/pap/synthetic/` is the fixture source: a card written by the same EDF
writer the device format demands, then read back through the real importer. `synthetic/card.ts` writes a whole
ResMed card, and `edf/writer.ts` builds EDF files byte by byte, which is the only way to reach header rules like a
declared record count of -1. There is no checked in real card.

Every rule listed above is one a test should pin. A parser bug starts with the test that reproduces it, using the
real bytes that triggered it.
