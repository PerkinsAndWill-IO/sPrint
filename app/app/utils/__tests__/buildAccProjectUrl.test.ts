import { describe, it, expect } from 'vitest'
import { buildAccProjectUrl } from '../index'

describe('buildAccProjectUrl', () => {
  it('links to the ACC site of each region', () => {
    const cases: Record<string, string> = {
      US: 'https://acc.autodesk.com',
      EMEA: 'https://acc.autodesk.eu',
      AUS: 'https://acc.aus.autodesk.com',
      CAN: 'https://acc.can.autodesk.com',
      DEU: 'https://acc.deu.autodesk.com',
      IND: 'https://acc.ind.autodesk.com',
      JPN: 'https://acc.jpn.autodesk.com',
      GBR: 'https://acc.gbr.autodesk.com'
    }
    for (const [region, host] of Object.entries(cases)) {
      expect(buildAccProjectUrl('b.abc', region)).toBe(`${host}/docs/files/projects/abc`)
    }
  })

  it('accepts aliases and lower case (APAC, CA, emea)', () => {
    expect(buildAccProjectUrl('b.abc', 'APAC')).toBe('https://acc.aus.autodesk.com/docs/files/projects/abc')
    expect(buildAccProjectUrl('b.abc', 'CA')).toBe('https://acc.can.autodesk.com/docs/files/projects/abc')
    expect(buildAccProjectUrl('b.abc', 'emea')).toBe('https://acc.autodesk.eu/docs/files/projects/abc')
  })

  it('falls back to the US site for a missing or unknown region', () => {
    expect(buildAccProjectUrl('b.abc')).toBe('https://acc.autodesk.com/docs/files/projects/abc')
    expect(buildAccProjectUrl('b.abc', 'MARS')).toBe('https://acc.autodesk.com/docs/files/projects/abc')
  })

  it('adds the item as entityId', () => {
    expect(buildAccProjectUrl('b.abc', 'CAN', 'urn:adsk.wipprod:dm.lineage:x'))
      .toBe('https://acc.can.autodesk.com/docs/files/projects/abc?entityId=urn%3Aadsk.wipprod%3Adm.lineage%3Ax')
  })
})
