import { describe, it, expect } from 'vitest'
import { filterPdfDerivatives, extractPdfViewSets, checkRevitVersion } from '../../utils/derivatives'
import type { ApsManifest } from '~/types/derivatives'
import {
  mockManifestWithPdfs,
  mockManifestNoPdfs,
  mockManifestOldRevit
} from '../fixtures/manifest'

function normalizeManifest(manifest: ApsManifest) {
  const firstDerivative = manifest.derivatives[0]
  const derivatives = filterPdfDerivatives(firstDerivative.children)
  const viewSets = extractPdfViewSets(derivatives)
  const { supported: revitVersionSupported, version: revitVersion } = checkRevitVersion(firstDerivative)

  return {
    modelName: firstDerivative.name,
    derivatives,
    viewSets,
    revitVersionSupported,
    revitVersion
  }
}

describe('manifest endpoint response transformation', () => {
  it('normalizes manifest with PDFs into structured response', () => {
    const result = normalizeManifest(mockManifestWithPdfs)

    expect(result.modelName).toBe('TestModel.rvt')
    expect(result.derivatives).toHaveLength(2)
    expect(result.viewSets).toHaveLength(2)
    expect(result.revitVersionSupported).toBe(true)
    expect(result.revitVersion).toBe(2024)
  })

  it('returns empty derivatives for manifest with no 2d views', () => {
    const result = normalizeManifest(mockManifestNoPdfs)

    expect(result.derivatives).toEqual([])
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
