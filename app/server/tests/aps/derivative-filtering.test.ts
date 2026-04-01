import { describe, it, expect } from 'vitest'
import {
  filterPdfDerivatives,
  filterDerivatives,
  resolveFormat,
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
  mockAecChild,
  mockSdbChild,
  mockSvfChild,
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

  it('uses parent descriptive name for PDF derivatives', () => {
    const result = filterPdfDerivatives([mockPdfChild1])
    expect(result[0].name).toBe('A001 - Floor Plan')
  })

  it('falls back to URN filename when parent has no name', () => {
    const noNameParent = { ...mockPdfChild1, name: '' }
    const result = filterPdfDerivatives([noNameParent])
    expect(result[0].name).toBe('A001.pdf')
  })

  it('falls back to child name when parent has no name and no URN', () => {
    const result = filterPdfDerivatives([mockPdfChildNoUrn])
    expect(result[0].name).toBe('S001 - Structural')
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

describe('resolveFormat', () => {
  it('resolves pdf-page role as pdf', () => {
    expect(resolveFormat({ guid: 'x', name: 'x', role: 'pdf-page', urn: 'urn:x/A001.pdf' })).toBe('pdf')
  })

  it('resolves .pdf URN as pdf', () => {
    expect(resolveFormat({ guid: 'x', name: 'x', role: '2d', urn: 'urn:x/output.pdf' })).toBe('pdf')
  })

  it('resolves thumbnail role', () => {
    expect(resolveFormat(mockThumbnailChild)).toBe('thumbnail')
  })

  it('resolves AECModelData.json as aec', () => {
    expect(resolveFormat(mockAecChild)).toBe('aec')
  })

  it('resolves model.sdb as sdb', () => {
    expect(resolveFormat(mockSdbChild)).toBe('sdb')
  })

  it('resolves .svf as svf', () => {
    expect(resolveFormat(mockSvfChild)).toBe('svf')
  })

  it('resolves .dwg as dwg', () => {
    expect(resolveFormat({ guid: 'x', name: 'x', role: 'x', urn: 'urn:x/output.dwg' })).toBe('dwg')
  })

  it('resolves .dwf as dwf', () => {
    expect(resolveFormat({ guid: 'x', name: 'x', role: 'x', urn: 'urn:x/output.dwf' })).toBe('dwf')
  })

  it('resolves .ifc as ifc', () => {
    expect(resolveFormat({ guid: 'x', name: 'x', role: 'x', urn: 'urn:x/output.ifc' })).toBe('ifc')
  })

  it('resolves unknown extension as other', () => {
    expect(resolveFormat({ guid: 'x', name: 'x', role: 'x', urn: 'urn:x/output.xyz' })).toBe('other')
  })
})

describe('filterDerivatives (all formats)', () => {
  it('extracts all derivative types from mixed children', () => {
    const result = filterDerivatives([mockPdfChild1, mockThumbnailChild, mockAecChild, mockSdbChild])
    expect(result).toHaveLength(4)
    expect(result.map(d => d.format)).toEqual(['pdf', 'thumbnail', 'aec', 'sdb'])
  })

  it('sets only PDFs as active by default', () => {
    const result = filterDerivatives([mockPdfChild1, mockThumbnailChild, mockAecChild])
    const pdf = result.find(d => d.format === 'pdf')
    const thumb = result.find(d => d.format === 'thumbnail')
    const aec = result.find(d => d.format === 'aec')
    expect(pdf!.active).toBe(true)
    expect(thumb!.active).toBe(false)
    expect(aec!.active).toBe(false)
  })

  it('filters by specific formats', () => {
    const result = filterDerivatives([mockPdfChild1, mockThumbnailChild, mockAecChild], ['aec', 'thumbnail'])
    expect(result).toHaveLength(2)
    expect(result.map(d => d.format)).toEqual(['thumbnail', 'aec'])
  })

  it('assigns correct mimeType for aec', () => {
    const result = filterDerivatives([mockAecChild])
    expect(result[0].mimeType).toBe('application/json')
  })

  it('detects svf from nested children', () => {
    const result = filterDerivatives([mock3dChild])
    const svf = result.find(d => d.format === 'svf')
    expect(svf).toBeDefined()
    expect(svf!.name).toBe('model.svf')
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
