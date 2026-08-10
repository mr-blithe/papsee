import { describe, expect, it } from 'vitest'
import { detectCard, isSupported } from './detect'

describe('recognising a ResMed card', () => {
  it('recognises the card layout the device actually writes', () => {
    expect(detectCard(['STR.edf', 'DATALOG/20260808/20260808_185112_BRP.edf', 'Identification.json'])).toBe('resmed')
  })

  it('recognises a card handed over without its DATALOG folder', () => {
    expect(detectCard(['STR.edf'])).toBe('resmed')
    expect(detectCard(['Identification.tgt'])).toBe('resmed')
  })

  it('recognises the card through the folder the user picked', () => {
    expect(detectCard(['my card/DATALOG/20260808/20260808_185112_PLD.edf'])).toBe('resmed')
  })
})

describe('naming a card we cannot read', () => {
  it('names a Philips card rather than reporting an empty night', () => {
    expect(detectCard(['P-SERIES/P1234567/PROP.TXT', 'P-SERIES/P1234567/1.001'])).toBe('philips')
  })

  it('recognises the Philips folder whatever case the device wrote it in', () => {
    expect(detectCard(['p-series/x/data.001'])).toBe('philips')
  })

  it('names the other brands OSCAR reads', () => {
    expect(detectCard(['FPHCARE/ICON/SLEEPSTYLE/L0001.EDF'])).toBe('fisherPaykel')
    expect(detectCard(['config.pscfg'])).toBe('lowenstein')
    expect(detectCard(['WM_DATA.TDF'])).toBe('lowenstein')
    expect(detectCard(['SL/SET1'])).toBe('devilbiss')
    expect(detectCard(['DV6/SET.BIN'])).toBe('devilbiss')
    expect(detectCard(['THERAPY/CONFIG/x.dat'])).toBe('resvent')
    expect(detectCard(['20260808.usr'])).toBe('bmc')
  })
})

describe('a folder that is not a card at all', () => {
  it('reports nothing recognised rather than guessing at ResMed', () => {
    expect(detectCard([])).toBeNull()
    expect(detectCard(['holiday/photo.jpg', 'notes.txt'])).toBeNull()
  })

  it('does not treat an unrelated EDF recording as a ResMed card', () => {
    expect(detectCard(['sleep-study/night1.edf'])).toBeNull()
  })
})

describe('what the panel is allowed to import', () => {
  it('supports ResMed and nothing else yet', () => {
    expect(isSupported('resmed')).toBe(true)
    expect(isSupported('philips')).toBe(false)
    expect(isSupported(null)).toBe(false)
  })
})
