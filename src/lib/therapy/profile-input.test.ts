import { describe, expect, it } from 'vitest'
import { DEVICE_GUIDE_IDS } from './device-guides'
import { parseProfileInput, patientAge, PROFILE_LIMITS } from './profile-input'

const COMPLETE = {
  bornOn: '1979-06-14',
  heightCm: 178,
  weightKg: 84.5,
  diagnosedOn: '2024-11-03',
  diagnosisAhi: 41.2,
  deviceGuide: 'resmedAirSense11',
}

describe('patient profile input', () => {
  it('accepts a filled in profile unchanged', () => {
    expect(parseProfileInput(COMPLETE)).toEqual(COMPLETE)
  })

  it('accepts a profile that answers nothing, so a reader can skip questions', () => {
    expect(parseProfileInput({})).toEqual({
      bornOn: null,
      heightCm: null,
      weightKg: null,
      diagnosedOn: null,
      diagnosisAhi: null,
      deviceGuide: null,
    })
  })

  it('rejects a birth date nobody could have, in either direction', () => {
    expect(parseProfileInput({ ...COMPLETE, bornOn: '1723-04-02' })).toBeNull()
    expect(parseProfileInput({ ...COMPLETE, bornOn: '2099-01-01' })).toBeNull()
    expect(parseProfileInput({ ...COMPLETE, bornOn: '1979-02-30' })).toBeNull()
  })

  it('accepts the earliest birth date it allows, so the boundary is usable rather than off by one', () => {
    expect(parseProfileInput({ bornOn: PROFILE_LIMITS.earliestBirthDate })?.bornOn).toBe(
      PROFILE_LIMITS.earliestBirthDate,
    )
  })

  it('rejects a body measurement outside anything a person could have', () => {
    expect(parseProfileInput({ ...COMPLETE, heightCm: 4 })).toBeNull()
    expect(parseProfileInput({ ...COMPLETE, weightKg: 0 })).toBeNull()
    expect(parseProfileInput({ ...COMPLETE, weightKg: -84 })).toBeNull()
  })

  it('rejects a negative AHI at diagnosis, which would invert the trend it anchors', () => {
    expect(parseProfileInput({ ...COMPLETE, diagnosisAhi: -1 })).toBeNull()
  })

  it('rejects a diagnosis date that is not a real calendar date', () => {
    expect(parseProfileInput({ ...COMPLETE, diagnosedOn: '2024-02-31' })).toBeNull()
    expect(parseProfileInput({ ...COMPLETE, diagnosedOn: 'yesterday' })).toBeNull()
  })

  it('rejects a number sent as a string rather than coercing it', () => {
    expect(parseProfileInput({ ...COMPLETE, heightCm: '178' })).toBeNull()
    expect(parseProfileInput({ ...COMPLETE, diagnosisAhi: Number.NaN })).toBeNull()
  })

  it('rejects a body that is not an object at all', () => {
    expect(parseProfileInput(null)).toBeNull()
    expect(parseProfileInput('bornOn=1979-06-14')).toBeNull()
  })

  it('accepts only a device the import guide can actually explain', () => {
    for (const id of DEVICE_GUIDE_IDS) {
      expect(parseProfileInput({ deviceGuide: id })?.deviceGuide, id).toBe(id)
    }
    expect(parseProfileInput({ deviceGuide: '  resmedAirSense11  ' })?.deviceGuide).toBe('resmedAirSense11')
    expect(parseProfileInput({ deviceGuide: '' })?.deviceGuide).toBeNull()
  })

  it('rejects a device nobody wrote a guide for, rather than storing it and showing a blank page', () => {
    expect(parseProfileInput({ deviceGuide: 'philips-dreamstation' })).toBeNull()
    expect(parseProfileInput({ deviceGuide: 'x'.repeat(200) })).toBeNull()
  })
})

describe('working out an age from a birth date', () => {
  it('has not counted this year yet when the birthday is still ahead', () => {
    expect(patientAge('1979-06-14', '2026-06-13')).toBe(46)
    expect(patientAge('1979-06-14', '2026-06-14')).toBe(47)
    expect(patientAge('1979-06-14', '2026-06-15')).toBe(47)
  })

  it('counts the year across a December to January boundary', () => {
    expect(patientAge('1979-12-31', '2026-01-01')).toBe(46)
    expect(patientAge('1979-01-01', '2026-12-31')).toBe(47)
  })

  it('reports a newborn as zero rather than as nothing', () => {
    expect(patientAge('2026-08-10', '2026-08-10')).toBe(0)
  })

  it('refuses a birth date in the future or a date that is not one', () => {
    expect(patientAge('2027-01-01', '2026-08-10')).toBeNull()
    expect(patientAge('yesterday', '2026-08-10')).toBeNull()
  })
})
