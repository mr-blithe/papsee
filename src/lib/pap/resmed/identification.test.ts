import { describe, expect, it } from 'vitest'
import { parseIdentificationTgt } from './identification'

const S9_TGT = ['#IMEI 0', '#SRN 22121234567', '#PCD 36037', '#PNA S9_VPAP_Adapt', '#PVA S9', '#RCD 001', ''].join(
  '\r\n',
)

describe('the identification file an S9 and AirSense 10 write', () => {
  it('reads the device the panel would otherwise leave empty', () => {
    const device = parseIdentificationTgt(S9_TGT)

    expect(device?.serialNumber).toBe('22121234567')
    expect(device?.productCode).toBe('36037')
    expect(device?.productName).toBe('S9 VPAP Adapt')
  })

  it('reads the model number the AirSense 11 enum tables are chosen by', () => {
    expect(parseIdentificationTgt(S9_TGT)?.modelNumber).toBe(36037)
    expect(parseIdentificationTgt('#PCD 39410\n#SRN 1')?.modelNumber).toBe(39410)
  })

  it('returns nothing for a file that identifies no device', () => {
    expect(parseIdentificationTgt('')).toBeNull()
    expect(parseIdentificationTgt('not an identification file')).toBeNull()
  })
})
