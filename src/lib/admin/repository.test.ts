// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// This module is the only way the admin area reaches the database, so what it is allowed to select
// is the whole of the rule that an admin never sees anyone's therapy data. The rule is not one the
// type system can state and not one a test can reach at runtime without a Postgres, so it is pinned
// against the source. messages.test.ts reads the catalogs the same way.
const source = readFileSync(new URL('./repository.ts', import.meta.url), 'utf8')

// Every column that describes a night rather than an account, in either spelling: as a drizzle
// reference and as an interpolation inside a sql template.
const PAYLOAD_COLUMNS = [
  'ahi',
  'oai',
  'cai',
  'hi',
  'reraIndex',
  'leakP95',
  'pressureP95',
  'usageMinutes',
  'summary',
  'settings',
  'sessionBounds',
  'startMs',
  'endMs',
  'samples',
  'bytes',
  'path',
  'device',
  'settingGroups',
  'unreadable',
]

const PAYLOAD_TABLES = ['papChannel', 'papEvent', 'papFile']

describe('the admin read model', () => {
  it('names no column that describes a night', () => {
    for (const column of PAYLOAD_COLUMNS) {
      expect(source, `${column} must not be selected by the admin read model`).not.toMatch(
        new RegExp(`\\.${column}\\b`),
      )
    }
  })

  it('never reaches the tables that hold the nights themselves', () => {
    for (const table of PAYLOAD_TABLES) {
      expect(source, `${table} must not be read by the admin read model`).not.toMatch(new RegExp(`\\b${table}\\b`))
    }
  })

  // A therapy day key says which nights somebody was on treatment, which is a fact about their
  // health rather than about their account. Counting the rows says whether the account is active
  // without saying anything about when they slept.
  it('counts pap_day rows and never dates them', () => {
    expect(source).not.toMatch(/\bpapDay\.date\b/)
  })

  // Without this the two above would pass on an emptied file, which is the way a guard like this
  // usually rots.
  it('still reads the two tables the counts come from', () => {
    expect(source).toMatch(/\bpapImport\b/)
    expect(source).toMatch(/\bpapDay\b/)
    expect(source).toMatch(/count\(\*\)/)
  })
})
