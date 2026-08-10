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
    expect(detectCard(['WM_DATA.TDF'])).toBe('lowenstein')
    expect(detectCard(['SL/SET1'])).toBe('devilbiss')
    expect(detectCard(['DV6/SET.BIN'])).toBe('devilbiss')
    expect(detectCard(['THERAPY/CONFIG/x.dat', 'THERAPY/RECORD/202608/08/1.dat'])).toBe('resvent')
    expect(detectCard(['20260808.usr', '20260808.idx', '20260808.000'])).toBe('bmc')
  })

  it('tells a Prisma card apart from the older Löwenstein formats, which are read by nothing here', () => {
    expect(detectCard(['config.pscfg'])).toBe('lowensteinPrisma')
    expect(detectCard(['CONFIG.PSCFG'])).toBe('lowensteinPrisma')
    expect(detectCard(['config.pcfg', 'therapy.pdat'])).toBe('lowenstein')
    expect(detectCard(['WM_DATA.TDF'])).toBe('lowenstein')
  })

  it('names a Philips card through the properties file of either DreamStation generation', () => {
    expect(detectCard(['P-SERIES/P1234567/PROP1.TXT'])).toBe('philips')
    expect(detectCard(['P-SERIES/P1234567/PROP.BIN'])).toBe('philips')
  })

  it('names a vREM card, which OSCAR knows by the two text files beside its therapy data', () => {
    expect(detectCard(['VREM/PI.txt', 'VREM/DI.txt', 'VREM/20260808.dat'])).toBe('vrem')
    expect(detectCard(['vrem001/di.txt', 'vrem001/pi.txt'])).toBe('vrem')
  })

  it('names a Yuwell card through the extension all four of its layouts share', () => {
    expect(detectCard(['RunLog.bys', 'YH550-1234/0100001.BYS'])).toBe('yuwell')
    expect(detectCard(['YHSD-NEW.BYS'])).toBe('yuwell')
    expect(detectCard(['YH830-1234/0100001.BYS'])).toBe('yuwell')
  })

  it('names the BMC G3 X series, which writes no .usr file at all', () => {
    expect(detectCard(['20260808.idx', '20260808.000'])).toBe('bmc')
  })
})

describe('signatures loose enough to name the wrong brand', () => {
  it('does not call any folder named therapy a Resvent card', () => {
    expect(detectCard(['therapy/notes.txt'])).toBeNull()
    expect(detectCard(['THERAPY/CONFIG/x.dat'])).toBeNull()
  })

  it('does not call a lone index file a BMC card, because OSCAR wants the whole set', () => {
    expect(detectCard(['20260808.usr'])).toBeNull()
    expect(detectCard(['20260808.idx'])).toBeNull()
  })

  it('wants a BMC index and data file that belong to each other', () => {
    expect(detectCard(['20260808.idx', '20260809.000'])).toBeNull()
  })

  it('does not call a stray settings file a DeVilbiss card', () => {
    expect(detectCard(['SET1'])).toBeNull()
    expect(detectCard(['backup/SET.BIN'])).toBeNull()
  })

  it('wants both text files before it calls a folder a vREM card', () => {
    expect(detectCard(['VREM/PI.txt'])).toBeNull()
    expect(detectCard(['notes/PI.txt', 'notes/DI.txt'])).toBeNull()
  })

  it('does not read every document beginning with prop as a Philips properties file', () => {
    expect(detectCard(['proposal.txt'])).toBeNull()
    expect(detectCard(['properties.txt'])).toBeNull()
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
