import { describe, it, expect } from 'vitest'
import {
  filterPdfDerivatives,
  extractPdfViewSets,
  groupDerivativesByViewSet,
  checkRevitVersion
} from '../../utils/derivatives'
import {
  mockPdfChild1,
  mockPdfChild2,
  mock3dChild,
  mockThumbnailChild,
  mockPdfChildNoUrn,
  mockDerivativeWithPdfs,
  mockDerivativeNoPdfs,
  mockDerivativeOldRevit,
  mockDerivativeNoVersion
} from '../fixtures/manifest'

describe('filterPdfDerivatives', () => {
  it('extracts pdf-page derivatives from children that have them', () => {
    const result = filterPdfDerivatives([mockPdfChild1, mockPdfChild2])
    expect(result).toHaveLength(2)
    expect(result[0].guid).toBe('guid-a001-pdf')
    expect(result[1].guid).toBe('guid-a002-pdf')
  })

  it('returns empty array when no pdf-page children exist', () => {
    const result = filterPdfDerivatives([mock3dChild, mockThumbnailChild])
    expect(result).toEqual([])
  })

  it('skips children without pdf-page sub-children', () => {
    const result = filterPdfDerivatives([mockPdfChild1, mock3dChild, mockThumbnailChild])
    expect(result).toHaveLength(1)
    expect(result[0].guid).toBe('guid-a001-pdf')
  })

  it('carries ViewSets from parent to PdfDerivative.viewSets', () => {
    const result = filterPdfDerivatives([mockPdfChild1])
    expect(result[0].viewSets).toEqual(['Sheet Set 1'])
  })

  it('normalizes ViewSets string to string[]', () => {
    const result = filterPdfDerivatives([mockPdfChild1])
    // mockPdfChild1 has ViewSets as a single string
    expect(Array.isArray(result[0].viewSets)).toBe(true)
    expect(result[0].viewSets).toEqual(['Sheet Set 1'])
  })

  it('preserves ViewSets array as-is', () => {
    const result = filterPdfDerivatives([mockPdfChild2])
    // mockPdfChild2 has ViewSets as string[]
    expect(result[0].viewSets).toEqual(['Sheet Set 1', 'Sheet Set 2'])
  })

  it('derives name from URN last path segment', () => {
    const result = filterPdfDerivatives([mockPdfChild1])
    expect(result[0].name).toBe('A001.pdf')
  })

  it('falls back to derivative name when URN is missing', () => {
    const result = filterPdfDerivatives([mockPdfChildNoUrn])
    expect(result[0].name).toBe('S001 - Structural.pdf')
  })

  it('sets all derivatives as active by default', () => {
    const result = filterPdfDerivatives([mockPdfChild1, mockPdfChild2])
    expect(result.every(d => d.active)).toBe(true)
  })

  it('returns empty array for empty input', () => {
    expect(filterPdfDerivatives([])).toEqual([])
  })
})

describe('extractPdfViewSets', () => {
  it('extracts unique ViewSet names with active: true', () => {
    const derivatives = filterPdfDerivatives([mockPdfChild1, mockPdfChild2])
    const viewSets = extractPdfViewSets(derivatives)

    expect(viewSets).toHaveLength(2)
    expect(viewSets).toEqual([
      { name: 'Sheet Set 1', active: true },
      { name: 'Sheet Set 2', active: true }
    ])
  })

  it('returns empty array for empty input', () => {
    expect(extractPdfViewSets([])).toEqual([])
  })

  it('deduplicates ViewSet names', () => {
    const derivatives = filterPdfDerivatives([mockPdfChild1, mockPdfChild2])
    const viewSets = extractPdfViewSets(derivatives)
    const names = viewSets.map(v => v.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('groupDerivativesByViewSet', () => {
  it('groups derivatives by viewSets property', () => {
    const derivatives = filterPdfDerivatives([mockPdfChild1, mockPdfChild2])
    const groups = groupDerivativesByViewSet(derivatives)

    expect(groups.get('Sheet Set 1')).toHaveLength(2)
    expect(groups.get('Sheet Set 2')).toHaveLength(1)
  })

  it('places derivative in multiple groups if it has multiple viewSets', () => {
    const derivatives = filterPdfDerivatives([mockPdfChild2])
    const groups = groupDerivativesByViewSet(derivatives)

    expect(groups.get('Sheet Set 1')).toHaveLength(1)
    expect(groups.get('Sheet Set 2')).toHaveLength(1)
    // Same derivative in both groups
    expect(groups.get('Sheet Set 1')![0].guid).toBe(groups.get('Sheet Set 2')![0].guid)
  })

  it('returns empty Map for empty input', () => {
    const groups = groupDerivativesByViewSet([])
    expect(groups.size).toBe(0)
  })
})

describe('checkRevitVersion', () => {
  it('returns supported: true for Revit 2024', () => {
    const result = checkRevitVersion(mockDerivativeWithPdfs)
    expect(result).toEqual({ supported: true, version: 2024 })
  })

  it('returns supported: false for Revit 2020', () => {
    const result = checkRevitVersion(mockDerivativeOldRevit)
    expect(result).toEqual({ supported: false, version: 2020 })
  })

  it('returns supported: true for Revit 2022 (boundary)', () => {
    const derivative = {
      ...mockDerivativeWithPdfs,
      properties: { 'Document Information': { RVTVersion: '2022' } }
    }
    const result = checkRevitVersion(derivative)
    expect(result).toEqual({ supported: true, version: 2022 })
  })

  it('returns supported: false with version: null when version is missing', () => {
    const result = checkRevitVersion(mockDerivativeNoVersion)
    expect(result).toEqual({ supported: false, version: null })
  })
})
