import { describe, it, expect } from 'vitest'
import { normalizeManifestResponse, emptyManifestResponse } from '../../utils/derivatives'
import type { ApsManifest } from '~/types/derivatives'
import {
  mockManifestWithPdfs,
  mockManifestNoPdfs,
  mockManifestOldRevit
} from '../fixtures/manifest'

// filterDerivatives (not the deprecated PDF-only variant) surfaces non-PDF
// formats too, so counts below include the 3D/thumbnail entries
const normalizeManifest = normalizeManifestResponse

describe('manifest endpoint response transformation', () => {
  it('normalizes manifest with PDFs into structured response', () => {
    const result = normalizeManifest(mockManifestWithPdfs)

    expect(result.modelName).toBe('TestModel.rvt')
    expect(result.derivatives.filter(d => d.format === 'pdf')).toHaveLength(2)
    expect(result.viewSets).toHaveLength(2)
    expect(result.revitVersionSupported).toBe(true)
    expect(result.revitVersion).toBe(2024)
  })

  it('returns no PDFs or view sets for manifest with no 2d views', () => {
    const result = normalizeManifest(mockManifestNoPdfs)

    expect(result.derivatives.filter(d => d.format === 'pdf')).toEqual([])
    expect(result.viewSets).toEqual([])
    expect(result.modelName).toBe('TestModel.rvt')
  })

  it('passes through Revit version check for old Revit', () => {
    const result = normalizeManifest(mockManifestOldRevit)

    expect(result.revitVersionSupported).toBe(false)
    expect(result.revitVersion).toBe(2020)
  })

  it('derivatives have expected shape', () => {
    const result = normalizeManifest(mockManifestWithPdfs)
    const first = result.derivatives[0]

    expect(first).toHaveProperty('guid')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('urn')
    expect(first).toHaveProperty('viewSets')
    expect(first).toHaveProperty('active')
    expect(first.active).toBe(true)
  })

  it('viewSets have expected shape', () => {
    const result = normalizeManifest(mockManifestWithPdfs)
    const first = result.viewSets[0]

    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('active')
    expect(first.active).toBe(true)
  })
})

describe('manifest resilience (empty / malformed / 404)', () => {
  const empty = emptyManifestResponse()

  it('null manifest (APS 404 path) yields the empty response', () => {
    expect(normalizeManifestResponse(null)).toEqual(empty)
    expect(normalizeManifestResponse(undefined)).toEqual(empty)
  })

  it('manifest with empty derivatives array yields the empty response', () => {
    expect(normalizeManifestResponse({ urn: 'u', derivatives: [] })).toEqual(empty)
  })

  it('manifest with non-array derivatives yields the empty response', () => {
    const malformed = { urn: 'u', derivatives: 'oops' } as unknown as ApsManifest
    expect(normalizeManifestResponse(malformed)).toEqual(empty)
  })

  it('derivative with no children yields no derivatives, does not throw', () => {
    const manifest = {
      urn: 'u',
      derivatives: [{ name: 'Model.rvt', children: undefined }]
    } as unknown as ApsManifest
    const result = normalizeManifestResponse(manifest)
    expect(result.modelName).toBe('Model.rvt')
    expect(result.derivatives).toEqual([])
    expect(result.viewSets).toEqual([])
  })

  it('derivative with non-array children does not throw', () => {
    const manifest = {
      urn: 'u',
      derivatives: [{ name: 'Model.rvt', children: { bogus: true } }]
    } as unknown as ApsManifest
    expect(normalizeManifestResponse(manifest).derivatives).toEqual([])
  })

  it('empty response shape matches the normal response shape', () => {
    expect(empty).toEqual({
      modelName: 'Unknown',
      derivatives: [],
      viewSets: [],
      revitVersionSupported: false,
      revitVersion: null
    })
  })
})
