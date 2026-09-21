import type { Derivative } from '~/types/derivatives'

export type PdfSort = 'number-asc' | 'number-desc' | 'name-asc' | 'name-desc' | 'pdm' | 'original'

/**
 * Perkins&Will Project Delivery Manual discipline codes, in sheet-set order.
 * G General, C Civil, L Landscape, A Architectural, I Interiors, Q Specialty
 * Equipment, S Structural, F Fire Protection, P Plumbing, M Mechanical,
 * E Electrical, T Telecommunications, W Wayfinding/Signage/Graphics,
 * K Kitchen/Food Service, V Vertical Transportation, X Other Disciplines.
 */
export const PDM_DISCIPLINE_ORDER = ['G', 'C', 'L', 'A', 'I', 'Q', 'S', 'F', 'P', 'M', 'E', 'T', 'W', 'K', 'V', 'X'] as const

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function sheetParts(label: string) {
  const separator = label.indexOf(' - ')
  if (separator === -1) return { number: label, name: label }
  return {
    number: label.slice(0, separator),
    name: label.slice(separator + 3)
  }
}

/** Position of a sheet's discipline in the PDM order; unknown codes sort after every known one. */
function pdmRank(sheetNumber: string): number {
  const code = sheetNumber.trim().charAt(0).toUpperCase()
  const rank = (PDM_DISCIPLINE_ORDER as readonly string[]).indexOf(code)
  return rank === -1 ? PDM_DISCIPLINE_ORDER.length : rank
}

export function sortPdfDerivatives(derivatives: Derivative[], sort: PdfSort): Derivative[] {
  if (sort === 'original') return derivatives

  if (sort === 'pdm') {
    return [...derivatives].sort((a, b) => {
      const aNumber = sheetParts(a.name).number
      const bNumber = sheetParts(b.name).number
      return pdmRank(aNumber) - pdmRank(bNumber) || collator.compare(aNumber, bNumber)
    })
  }

  const [field, direction] = sort.split('-') as ['number' | 'name', 'asc' | 'desc']
  const factor = direction === 'asc' ? 1 : -1
  return [...derivatives].sort((a, b) =>
    collator.compare(sheetParts(a.name)[field], sheetParts(b.name)[field]) * factor
  )
}

export function orderDerivativesForExport(derivatives: Derivative[], sort: PdfSort): Derivative[] {
  const pdfs = sortPdfDerivatives(derivatives.filter(d => d.format === 'pdf'), sort)
  return [...pdfs, ...derivatives.filter(d => d.format !== 'pdf')]
}
