import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { mergePdfBuffers } from '../../utils/pdf-merge'

async function createSinglePagePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.addPage()
  const bytes = await doc.save()
  return Buffer.from(bytes)
}

describe('mergePdfBuffers', () => {
  it('merges two single-page PDFs into a 2-page PDF', async () => {
    const pdf1 = await createSinglePagePdf()
    const pdf2 = await createSinglePagePdf()

    const merged = await mergePdfBuffers([pdf1, pdf2])
    const doc = await PDFDocument.load(merged)
    expect(doc.getPageCount()).toBe(2)
  })

  it('returns same page count for a single PDF', async () => {
    const pdf = await createSinglePagePdf()

    const merged = await mergePdfBuffers([pdf])
    const doc = await PDFDocument.load(merged)
    expect(doc.getPageCount()).toBe(1)
  })

  it('throws on empty array', async () => {
    await expect(mergePdfBuffers([])).rejects.toThrow('Cannot merge empty array of PDFs')
  })
})
