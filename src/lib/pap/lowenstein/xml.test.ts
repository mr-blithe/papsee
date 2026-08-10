import { describe, expect, it } from 'vitest'
import { readElements, readInteger } from './xml'

describe('reading the flat elements of a device event file', () => {
  it('returns every element with its attributes, which is all this format is', () => {
    const elements = readElements(
      `<?xml version="1.0"?>\n<PrismaEvents>\n<DeviceEvent DeviceEventID="0" ParameterID="6" NewValue="2"/>\n<RespEvent RespEventID="101" EndTime="1200" Duration="300"/>\n</PrismaEvents>`,
    )

    expect(elements.map((element) => element.name)).toEqual(['PrismaEvents', 'DeviceEvent', 'RespEvent'])
    expect(elements[1].attributes).toEqual({ DeviceEventID: '0', ParameterID: '6', NewValue: '2' })
    expect(elements[2].attributes.EndTime).toBe('1200')
  })

  it('keeps a greater than sign inside a value, which a pattern that stops at the first one would cut', () => {
    const [element] = readElements(`<RespEvent Note="a > b" RespEventID="101"/>`)

    expect(element.attributes.Note).toBe('a > b')
    expect(element.attributes.RespEventID).toBe('101')
  })

  it('reads single quoted values, because the format permits either quote', () => {
    const [element] = readElements(`<DeviceEvent ParameterID='9' NewValue='800'/>`)

    expect(element.attributes).toEqual({ ParameterID: '9', NewValue: '800' })
  })

  it('skips a comment, a declaration and a CDATA block rather than reading them as elements', () => {
    const elements = readElements(
      `<!DOCTYPE x><!-- <RespEvent RespEventID="999"/> --><![CDATA[<RespEvent RespEventID="998"/>]]><RespEvent RespEventID="101"/>`,
    )

    expect(elements.map((element) => element.attributes.RespEventID)).toEqual(['101'])
  })

  it('decodes the entities a value may carry, so a number does not come back as text', () => {
    const [element] = readElements(`<DeviceEvent Label="Fl&#252;ge &amp; Leck" NewValue="&#x32;"/>`)

    expect(element.attributes.Label).toBe('Flüge & Leck')
    expect(element.attributes.NewValue).toBe('2')
  })

  it('drops a byte order mark, which would otherwise hide the first element', () => {
    const elements = readElements(`﻿<RespEvent RespEventID="101"/>`)

    expect(elements).toHaveLength(1)
  })

  it('returns nothing for a body that is not this format at all, rather than guessing', () => {
    expect(readElements('')).toEqual([])
    expect(readElements('not xml at all')).toEqual([])
  })
})

describe('reading an attribute as a number', () => {
  it('reports nothing for an absent or unusable attribute, never a confident zero', () => {
    const [element] = readElements(`<RespEvent EndTime="1200" Duration="" Strength="x"/>`)

    expect(readInteger(element, 'EndTime')).toBe(1200)
    expect(readInteger(element, 'Duration')).toBeNull()
    expect(readInteger(element, 'Strength')).toBeNull()
    expect(readInteger(element, 'Missing')).toBeNull()
  })
})
