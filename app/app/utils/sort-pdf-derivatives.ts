import type { Derivative } from '~/types/derivatives'

export type PdfSort = 'number-asc' | 'number-desc' | 'name-asc' | 'name-desc' | 'original'

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function sheetParts(label: string) {
  const separator = label.indexOf(' - ')
  if (separator === -1) return { number: label, name: label }
  return {
    number: label.slice(0, separator),
    name: label.slice(separator + 3)
  }
}

export function sortPdfDerivatives(derivatives: Derivative[], sort: PdfSort): Derivative[] {
  if (sort === 'original') return derivatives

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
