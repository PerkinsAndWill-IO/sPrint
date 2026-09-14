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
    ['original', ['s2', 'a10', 'a2']]
  ])('sorts by %s without changing the source list', (sort, expected) => {
    expect(sortPdfDerivatives(sheets, sort).map(sheet => sheet.guid)).toEqual(expected)
    expect(sheets.map(sheet => sheet.guid)).toEqual(['s2', 'a10', 'a2'])
  })

  it('uses the sheet sort for export and keeps advanced files after the PDFs', () => {
    const dwg = { ...sheets[0]!, guid: 'dwg', name: 'model.dwg', format: 'dwg' as const }
    const ordered = orderDerivativesForExport([dwg, ...sheets], 'name-asc')

    expect(ordered.map(item => item.guid)).toEqual(['a10', 'a2', 's2', 'dwg'])
  })
})
