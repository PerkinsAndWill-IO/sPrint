import { describe, expect, it } from 'vitest'
import { ACC_BASE_URLS, APS_REGIONS, normalizeApsRegion, regionFromAccUrl } from '../region'

describe('normalizeApsRegion', () => {
  it('keeps every documented region code', () => {
    expect([...APS_REGIONS]).toEqual(['US', 'EMEA', 'AUS', 'CAN', 'DEU', 'IND', 'JPN', 'GBR'])
    for (const region of APS_REGIONS) expect(normalizeApsRegion(region)).toBe(region)
  })

  it('ignores case and spaces', () => {
    expect(normalizeApsRegion('emea')).toBe('EMEA')
    expect(normalizeApsRegion(' jpn ')).toBe('JPN')
  })

  it('maps aliases and the deprecated APAC value', () => {
    expect(normalizeApsRegion('EU')).toBe('EMEA')
    expect(normalizeApsRegion('APAC')).toBe('AUS')
    expect(normalizeApsRegion('AU')).toBe('AUS')
    expect(normalizeApsRegion('CA')).toBe('CAN')
    expect(normalizeApsRegion('DE')).toBe('DEU')
    expect(normalizeApsRegion('IN')).toBe('IND')
    expect(normalizeApsRegion('JP')).toBe('JPN')
    expect(normalizeApsRegion('GB')).toBe('GBR')
    expect(normalizeApsRegion('uk')).toBe('GBR')
  })

  it('returns undefined for empty, unknown and non-string values', () => {
    for (const value of [undefined, null, '', '   ', 'MARS', 'US-EAST', 42, {}]) {
      expect(normalizeApsRegion(value)).toBeUndefined()
    }
  })
})

describe('regionFromAccUrl', () => {
  const project = '/docs/files/projects/abc?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.x'

  it('reads every regional ACC host from Autodesk\'s Regional Offerings FAQ', () => {
    for (const region of APS_REGIONS) {
      expect(regionFromAccUrl(`${ACC_BASE_URLS[region]}${project}`)).toBe(region)
    }
  })

  it('reads BIM 360 hosts', () => {
    expect(regionFromAccUrl('https://docs.b360.autodesk.com/projects/abc/folders/x/detail')).toBe('US')
    expect(regionFromAccUrl('https://docs.b360.eu.autodesk.com/projects/abc/folders/x/detail')).toBe('EMEA')
  })

  it('ignores case in the host', () => {
    expect(regionFromAccUrl(`https://ACC.CAN.AUTODESK.COM${project}`)).toBe('CAN')
  })

  it('returns undefined for unknown hosts and non-URLs', () => {
    expect(regionFromAccUrl(`https://acc.can.autodesk.com.evil.com${project}`)).toBeUndefined()
    expect(regionFromAccUrl(`https://evil-autodesk.com${project}`)).toBeUndefined()
    expect(regionFromAccUrl(`https://construction.autodesk.com${project}`)).toBeUndefined()
    expect(regionFromAccUrl('not a url')).toBeUndefined()
  })
})
