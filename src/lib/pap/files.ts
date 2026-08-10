import { deviceTime, papDayKey } from './device-time'

const IMPORTABLE_EXTENSIONS = ['.edf', '.json', '.tgt']

const DATALOG_FILENAME = /(\d{8})_(\d{6})_[A-Z0-9]+\.edf$/i

export function isImportable(path: string): boolean {
  const lower = path.toLowerCase()
  return IMPORTABLE_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

export function assignFilesToDays(paths: string[]): Map<string, string | null> {
  const assigned = new Map<string, string | null>()

  for (const path of paths) {
    const match = DATALOG_FILENAME.exec(path.split('/').pop() ?? '')
    if (!match) {
      assigned.set(path, null)
      continue
    }

    const [, date, time] = match
    const at = deviceTime(
      Number(date.slice(0, 4)),
      Number(date.slice(4, 6)),
      Number(date.slice(6, 8)),
      Number(time.slice(0, 2)),
      Number(time.slice(2, 4)),
      Number(time.slice(4, 6)),
    )

    assigned.set(path, papDayKey(at.getTime()))
  }

  return assigned
}
