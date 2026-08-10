import { describe, expect, it } from 'vitest'
import { AIRSENSE_11_MIN_MODEL, enumDecoder, isAutoMode } from './enums'

const AIRSENSE_10 = 37028
const AIRSENSE_11 = 39410

describe('AirSense 10 enum tables', () => {
  const decode = enumDecoder(AIRSENSE_10)

  it('reads on and off without a shift', () => {
    expect(decode.onOff(0)).toBe('Off')
    expect(decode.onOff(1)).toBe('On')
  })

  it('reads the mask table from zero', () => {
    expect(decode.mask(0)).toBe('Pillows')
    expect(decode.mask(1)).toBe('Full Face')
    expect(decode.mask(2)).toBe('Nasal')
  })

  it('reads therapy modes directly from the legacy table', () => {
    expect(decode.mode(0)).toBe('CPAP')
    expect(decode.mode(1)).toBe('AutoSet')
    expect(decode.mode(11)).toBe('AutoSet for Her')
  })

  it('offsets the expiratory relief type by one against the stored value', () => {
    expect(decode.eprType(0)).toBe('Ramp Only')
    expect(decode.eprType(1)).toBe('Full Time')
  })

  it('names the essentials options the AirSense 10 shows', () => {
    expect(decode.patientAccess(0)).toBe('Plus')
    expect(decode.patientAccess(1)).toBe('On')
  })
})

describe('AirSense 11 enum tables', () => {
  const decode = enumDecoder(AIRSENSE_11)

  it('shifts most settings down by one against AirSense 10', () => {
    expect(decode.onOff(1)).toBe('Off')
    expect(decode.onOff(2)).toBe('On')
    expect(decode.onOffAuto(3)).toBe('Auto')
    expect(decode.climateControl(1)).toBe('Auto')
    expect(decode.yesNo(1)).toBe('No')
    expect(decode.yesNo(2)).toBe('Yes')
  })

  it('shifts the mask table by two rather than one', () => {
    expect(decode.mask(2)).toBe('Pillows')
    expect(decode.mask(3)).toBe('Full Face')
    expect(decode.mask(4)).toBe('Nasal')
  })

  it('refuses to guess a mask value outside the shifted table', () => {
    expect(decode.mask(0)).toBe('Unknown')
    expect(decode.mask(1)).toBe('Unknown')
    expect(decode.mask(5)).toBe('Unknown')
  })

  it('remaps therapy modes through the legacy table', () => {
    expect(decode.mode(1)).toBe('AutoSet')
    expect(decode.mode(2)).toBe('AutoSet for Her')
    expect(decode.mode(3)).toBe('CPAP')
  })

  it('remaps the AirCurve 11 bilevel and ASV modes instead of reading the legacy table directly', () => {
    expect(decode.mode(4)).toBe('Bilevel Fixed')
    expect(decode.mode(6)).toBe('ASV')
    expect(decode.mode(7)).toBe('ASV Auto EPAP')
    expect(decode.mode(8)).toBe('Bilevel Auto')
  })

  it('says unknown for the mode values no AirSense 11 has been seen reporting', () => {
    expect(decode.mode(0)).toBe('Unknown')
    expect(decode.mode(5)).toBe('Unknown')
    expect(decode.mode(9)).toBe('Unknown')
  })

  it('names the patient view options the AirSense 11 shows', () => {
    expect(decode.patientAccess(1)).toBe('Advanced')
    expect(decode.patientAccess(2)).toBe('Simple')
  })

  it('reads the expiratory relief type without the legacy offset', () => {
    expect(decode.eprType(0)).toBe('Off')
    expect(decode.eprType(1)).toBe('Ramp Only')
    expect(decode.eprType(2)).toBe('Full Time')
  })
})

describe('the AirSense 11 model boundary', () => {
  it('treats a model number below the threshold as AirSense 10', () => {
    expect(enumDecoder(AIRSENSE_11_MIN_MODEL - 1).onOff(1)).toBe('On')
  })

  it('treats the threshold itself as AirSense 11', () => {
    expect(enumDecoder(AIRSENSE_11_MIN_MODEL).onOff(1)).toBe('Off')
  })
})

describe('unmapped values', () => {
  it('labels an out of range value rather than showing a neighbouring setting', () => {
    expect(enumDecoder(AIRSENSE_10).onOff(9)).toBe('Unknown (9)')
    expect(enumDecoder(AIRSENSE_10).mode(99)).toBe('Unknown (99)')
  })

  it('reports a setting the card never wrote as unknown, not as the first entry of the table', () => {
    const decode = enumDecoder(AIRSENSE_10)

    expect(decode.onOff(null)).toBe('Unknown')
    expect(decode.mask(null)).toBe('Unknown')
    expect(decode.eprType(null)).toBe('Unknown')
    expect(decode.rampMode(null)).toBe('Unknown')
    expect(decode.climateControl(null)).toBe('Unknown')
    expect(decode.patientAccess(null)).toBe('Unknown')
    expect(decode.yesNo(null)).toBe('Unknown')
  })
})

describe('isAutoMode', () => {
  it('recognises the pressure varying modes', () => {
    expect(isAutoMode('AutoSet')).toBe(true)
    expect(isAutoMode('AutoSet for Her')).toBe(true)
  })

  it('does not treat fixed pressure as automatic', () => {
    expect(isAutoMode('CPAP')).toBe(false)
  })
})
