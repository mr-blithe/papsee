import { describe, expect, it } from 'vitest'
import { CHANNEL_IDS } from '../types'
import { LARGE_LEAK_THRESHOLD, lookupChannel, lookupEventType } from './channels'

describe('unit conversions', () => {
  it('converts leak from litres per second to litres per minute', () => {
    const leak = lookupChannel('Leak.2s')

    expect(leak?.id).toBe('leak')
    expect(leak?.unit).toBe('L/min')
    expect(leak?.scale).toBe(60)
  })

  it('converts flow from litres per second to litres per minute', () => {
    const flow = lookupChannel('Flow.40ms')

    expect(flow?.unit).toBe('L/min')
    expect(flow?.scale).toBe(60)
  })

  it('converts tidal volume from litres to millilitres', () => {
    const tidalVolume = lookupChannel('TidVol.2s')

    expect(tidalVolume?.unit).toBe('mL')
    expect(tidalVolume?.scale).toBe(1000)
  })

  it('leaves minute ventilation in litres per minute as the device stores it', () => {
    const minuteVentilation = lookupChannel('MinVent.2s')

    expect(minuteVentilation?.unit).toBe('L/min')
    expect(minuteVentilation?.scale).toBe(1)
  })

  it('leaves pressures in cmH2O as the device stores them', () => {
    expect(lookupChannel('Press.2s')?.scale).toBe(1)
    expect(lookupChannel('MaskPress.2s')?.scale).toBe(1)
    expect(lookupChannel('EprPress.2s')?.scale).toBe(1)
  })
})

describe('channel identification', () => {
  it('maps the two mask pressure labels the device family uses onto one channel', () => {
    expect(lookupChannel('Press.40ms')?.id).toBe('maskPressure')
    expect(lookupChannel('MaskPress.2s')?.id).toBe('maskPressure')
  })

  it('separates therapy pressure from mask pressure', () => {
    expect(lookupChannel('Press.2s')?.id).toBe('therapyPressure')
  })

  it('returns null for a label it does not recognise', () => {
    expect(lookupChannel('Crc16')).toBeNull()
    expect(lookupChannel('EDF Annotations')).toBeNull()
  })

  it('only ever produces a channel id the rest of the application knows about', () => {
    const raw = [
      'Flow.40ms',
      'Press.40ms',
      'MaskPress.2s',
      'Press.2s',
      'EprPress.2s',
      'Leak.2s',
      'RespRate.2s',
      'TidVol.2s',
      'MinVent.2s',
      'Snore.2s',
      'FlowLim.2s',
      'Pulse.1s',
      'SpO2.1s',
    ]
    const produced = raw.map((label) => lookupChannel(label)?.id)

    expect(produced.every((id) => id !== undefined)).toBe(true)
    expect(produced.every((id) => CHANNEL_IDS.includes(id as (typeof CHANNEL_IDS)[number]))).toBe(true)
  })
})

describe('leak reference', () => {
  it('keeps the large leak reference in the same unit the leak channel is plotted in', () => {
    expect(LARGE_LEAK_THRESHOLD).toBeGreaterThan(0)
    expect(LARGE_LEAK_THRESHOLD).toBeLessThan(120)
  })
})

describe('labels the device writes inconsistently', () => {
  it('does not lose a channel to a change of case', () => {
    expect(lookupChannel('leak.2s')?.id).toBe('leak')
    expect(lookupChannel('FLOW.40MS')?.id).toBe('flow')
  })

  it('prefers the longest matching label so flow limitation is not read as flow', () => {
    expect(lookupChannel('FlowLim.2s')?.id).toBe('flowLimitation')
    expect(lookupChannel('Flow.40ms')?.id).toBe('flow')
    expect(lookupChannel('Flow')?.id).toBe('flow')
  })

  it('reads the short labels the S9 family writes', () => {
    expect(lookupChannel('Mask Pres')?.id).toBe('maskPressure')
    expect(lookupChannel('Therapy Pres')?.id).toBe('therapyPressure')
    expect(lookupChannel('RR')?.id).toBe('respiratoryRate')
    expect(lookupChannel('Vt')?.id).toBe('tidalVolume')
    expect(lookupChannel('MV')?.id).toBe('minuteVentilation')
    expect(lookupChannel('FFL Index')?.id).toBe('flowLimitation')
  })

  it('reads the labels a device sold outside English speaking markets writes', () => {
    expect(lookupChannel('Sızıntı')?.id).toBe('leak')
    expect(lookupChannel('Fuites')?.id).toBe('leak')
    expect(lookupChannel('Leck')?.id).toBe('leak')
    expect(lookupChannel('Nabiz')?.id).toBe('pulse')
    expect(lookupChannel('Pouls')?.id).toBe('pulse')
  })
})

describe('events the device scored', () => {
  it('reads an event whichever way the device capitalised it', () => {
    expect(lookupEventType('Obstructive Apnea')).toBe('obstructiveApnea')
    expect(lookupEventType('Obstructive apnea')).toBe('obstructiveApnea')
    expect(lookupEventType('Central Apnea')).toBe('centralApnea')
    expect(lookupEventType('Central apnea')).toBe('centralApnea')
  })

  it('does not read a scored obstructive apnea as an unspecified one', () => {
    expect(lookupEventType('Apnea')).toBe('apnea')
    expect(lookupEventType('Unclassified Apnea')).toBe('unclassifiedApnea')
  })

  it('reads the two names the device family uses for a respiratory effort arousal', () => {
    expect(lookupEventType('Arousal')).toBe('rera')
    expect(lookupEventType('RERA')).toBe('rera')
  })

  it('ignores the bookkeeping annotations rather than scoring them as events', () => {
    expect(lookupEventType('Recording starts')).toBeNull()
    expect(lookupEventType('Recording ends')).toBeNull()
    expect(lookupEventType('CSR End')).toBeNull()
    expect(lookupEventType('SpO2 Desaturation')).toBeNull()
  })

  it('still reads the start of periodic breathing', () => {
    expect(lookupEventType('CSR Start')).toBe('periodicBreathing')
  })
})
