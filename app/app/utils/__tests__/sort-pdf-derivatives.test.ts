import { describe, expect, it } from 'vitest'
import type { Derivative } from '~/types/derivatives'
import { orderDerivativesForExport, sortPdfDerivatives, type PdfSort } from '~/utils/sort-pdf-derivatives'

const sheets = [
  { guid: 's2', name: 'S2 - Zebra' },
  { guid: 'a10', name: 'A10 - Alpha' },
  { guid: 'a2', name: 'A2 - Beta' }
].map(sheet => ({
  ...sheet,
  urn: '',
  format: 'pdf',
  mimeType: 'application/pdf',
  viewSets: [],
  active: true
}) satisfies Derivative)

describe('sortPdfDerivatives', () => {
  it.each<[PdfSort, string[]]>([
    ['number-asc', ['a2', 'a10', 's2']],
    ['number-desc', ['s2', 'a10', 'a2']],
    ['name-asc', ['a10', 'a2', 's2']],
    ['name-desc', ['s2', 'a2', 'a10']],
    ['pdm', ['a2', 'a10', 's2']],
    ['original', ['s2', 'a10', 'a2']]
  ])('sorts by %s without changing the source list', (sort, expected) => {
    expect(sortPdfDerivatives(sheets, sort).map(sheet => sheet.guid)).toEqual(expected)
    expect(sheets.map(sheet => sheet.guid)).toEqual(['s2', 'a10', 'a2'])
  })

  it('sorts by PDM discipline code, then sheet number, with unknown codes last', () => {
    const set = [
      { guid: 'e', name: 'E101 - Power' },
      { guid: 'a2', name: 'A-201 - Sections' },
      { guid: 'unknown', name: 'R100 - Refrigeration' },
      { guid: 'g', name: 'G000 - Cover' },
      { guid: 'm', name: 'M101 - HVAC' },
      { guid: 'x', name: 'X100 - Other' },
      { guid: 'a1', name: 'A-101 - Plans' },
      { guid: 'digits', name: '001 - Index' },
      { guid: 's', name: 'S201 - Framing' },
      { guid: 'lower', name: 'c100 - Site' }
    ].map(sheet => ({ ...sheets[0]!, ...sheet }))

    expect(sortPdfDerivatives(set, 'pdm').map(sheet => sheet.guid))
      .toEqual(['g', 'lower', 'a1', 'a2', 's', 'm', 'e', 'x', 'digits', 'unknown'])
  })

  it('uses the sheet sort for export and keeps advanced files after the PDFs', () => {
    const dwg = { ...sheets[0]!, guid: 'dwg', name: 'model.dwg', format: 'dwg' as const }
    const ordered = orderDerivativesForExport([dwg, ...sheets], 'name-asc')

    expect(ordered.map(item => item.guid)).toEqual(['a10', 'a2', 's2', 'dwg'])
  })
})
