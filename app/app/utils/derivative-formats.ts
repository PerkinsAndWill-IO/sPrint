import type { DerivativeFormat } from '~/types/derivatives'

export const FORMAT_LABELS: Record<DerivativeFormat, string> = {
  pdf: 'PDF',
  dwg: 'DWG',
  dwf: 'DWF',
  ifc: 'IFC',
  thumbnail: 'Thumbnail',
  aec: 'AEC Data',
  sdb: 'SDB',
  svf: 'SVF',
  other: 'Other'
}

export type FormatColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

export const FORMAT_COLORS: Record<DerivativeFormat, FormatColor> = {
  pdf: 'error',
  dwg: 'primary',
  dwf: 'secondary',
  ifc: 'info',
  thumbnail: 'neutral',
  aec: 'info',
  sdb: 'warning',
  svf: 'success',
  other: 'neutral'
}

export const FORMAT_ORDER: readonly DerivativeFormat[] = ['pdf', 'dwg', 'dwf', 'ifc', 'svf', 'aec', 'sdb', 'thumbnail', 'other']

export const PREVIEWABLE_FORMATS: ReadonlySet<DerivativeFormat> = new Set(['pdf', 'thumbnail', 'aec', 'svf'])

export function getFormatCounts(derivatives: { format: DerivativeFormat }[]): { format: DerivativeFormat, label: string, color: FormatColor, count: number }[] {
  const counts = new Map<DerivativeFormat, number>()
  for (const d of derivatives) {
    counts.set(d.format, (counts.get(d.format) || 0) + 1)
  }
  return FORMAT_ORDER
    .filter(f => counts.has(f))
    .map(format => ({
      format,
      label: FORMAT_LABELS[format],
      color: FORMAT_COLORS[format],
      count: counts.get(format)!
    }))
}
