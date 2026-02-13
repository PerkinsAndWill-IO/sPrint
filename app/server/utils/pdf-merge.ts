import { PDFDocument } from 'pdf-lib'

export async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error('Cannot merge empty array of PDFs')
  }

  const merged = await PDFDocument.create()

  for (const buffer of buffers) {
    const source = await PDFDocument.load(buffer)
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) {
      merged.addPage(page)
    }
  }

  const pdfBytes = await merged.save()
  return Buffer.from(pdfBytes)
}
