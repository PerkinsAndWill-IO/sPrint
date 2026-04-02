import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { parseExportBody, sanitizeFolderName, inferMimeType } from '../../utils/aps-download'
import { mergePdfBuffers } from '../../utils/pdf-merge'
import { validateRegion, sanitizeHeaderFilename } from '../../utils/validation'

interface DerivativeFile {
  name: string
  data: Buffer
}

export default eventHandler(async (event) => {
  const body = await readBody(event)

  const result = parseExportBody(body)
  if ('error' in result) {
    throw createError({ statusCode: 400, statusMessage: result.error })
  }
  const { fileGroups, options } = result

  const rawToken = await getApsAccessToken(event)

  const region = validateRegion(body.region as string | undefined)

  // Download all derivatives from all file groups in parallel
  const allDownloads = await Promise.all(
    fileGroups.map(group => downloadAllDerivatives(group.urn, group.derivatives, rawToken, region))
  )

  // --- Partition helper: split files into PDFs and non-PDFs ---
  function partitionByPdf(files: DerivativeFile[]): { pdfs: DerivativeFile[], others: DerivativeFile[] } {
    const pdfs: DerivativeFile[] = []
    const others: DerivativeFile[] = []
    for (const f of files) {
      if (inferMimeType(f.name) === 'application/pdf') {
        pdfs.push(f)
      } else {
        others.push(f)
      }
    }
    return { pdfs, others }
  }

  // --- Merge phase ---
  interface OutputGroup {
    name: string
    files: DerivativeFile[]
  }

  let outputGroups: OutputGroup[]

  if (options.mergeScope === 'all') {
    const allFiles = allDownloads.flat()
    if (allFiles.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No derivatives to export' })
    }
    const { pdfs, others } = partitionByPdf(allFiles)
    const mergedFiles: DerivativeFile[] = []
    if (pdfs.length > 0) {
      const merged = await mergePdfBuffers(pdfs.map(f => f.data))
      mergedFiles.push({ name: 'merged.pdf', data: merged })
    }
    mergedFiles.push(...others)
    outputGroups = [{ name: 'merged', files: mergedFiles }]
  } else if (options.mergeScope === 'per-model') {
    outputGroups = await Promise.all(
      fileGroups.map(async (group, i) => {
        const files = allDownloads[i]!
        const groupName = sanitizeFolderName(group.name || `file-${i + 1}`)
        if (files.length === 0) return { name: groupName, files: [] as DerivativeFile[] }
        const { pdfs, others } = partitionByPdf(files)
        const resultFiles: DerivativeFile[] = []
        if (pdfs.length > 0) {
          const merged = await mergePdfBuffers(pdfs.map(f => f.data))
          resultFiles.push({ name: `${groupName}.pdf`, data: merged })
        }
        resultFiles.push(...others)
        return { name: groupName, files: resultFiles }
      })
    )
  } else {
    // mergeScope === 'none'
    outputGroups = fileGroups.map((group, i) => ({
      name: sanitizeFolderName(group.name || `file-${i + 1}`),
      files: allDownloads[i]!
    }))
  }

  // Filter out empty groups
  outputGroups = outputGroups.filter(g => g.files.length > 0)
  if (outputGroups.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No derivatives to export' })
  }

  // Total file count across all groups
  const totalFiles = outputGroups.reduce((sum, g) => sum + g.files.length, 0)

  // Check if all output files are PDFs
  const allPdf = outputGroups.every(g => g.files.every(f => inferMimeType(f.name) === 'application/pdf'))

  // --- Package phase ---
  if (!options.zip) {
    if (allPdf) {
      // Raw PDF — force merge if multiple files
      let singleFile: DerivativeFile
      if (totalFiles === 1) {
        singleFile = outputGroups[0]!.files[0]!
      } else {
        const allBuffers = outputGroups.flatMap(g => g.files.map(f => f.data))
        const merged = await mergePdfBuffers(allBuffers)
        singleFile = { name: 'merged.pdf', data: merged }
      }

      setResponseHeaders(event, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="derivatives.pdf"'
      })
      return singleFile.data
    }

    // Mixed content with zip disabled but multiple non-mergeable files — auto-force zip
    if (totalFiles === 1) {
      const file = outputGroups[0]!.files[0]!
      const mimeType = inferMimeType(file.name)
      setResponseHeaders(event, {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${sanitizeHeaderFilename(file.name)}"`
      })
      return file.data
    }
    // Fall through to zip for multiple mixed files
  }

  // zip: true (or forced for mixed content)
  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="derivatives.zip"'
  })

  const archive = archiver('zip', { zlib: { level: 5 } })
  const passThrough = new PassThrough()
  archive.pipe(passThrough)

  const useModelFolders = options.modelFolders && outputGroups.length > 1

  for (const group of outputGroups) {
    const folderPrefix = useModelFolders ? `${group.name}/` : ''
    for (const file of group.files) {
      archive.append(file.data, { name: `${folderPrefix}${file.name}` })
    }
  }

  archive.finalize()
  return sendStream(event, passThrough)
})
