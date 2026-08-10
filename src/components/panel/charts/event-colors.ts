import type { PapEventType } from '@/lib/pap'

export const EVENT_COLORS: Record<PapEventType, string> = {
  obstructiveApnea: '--event-obstructive',
  centralApnea: '--event-central',
  unclassifiedApnea: '--event-central',
  apnea: '--event-central',
  hypopnea: '--event-hypopnea',
  rera: '--event-rera',
  periodicBreathing: '--event-periodic',
}
