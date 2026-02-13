import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { parseExportBody, sanitizeFolderName } from '../../utils/aps-download'
import { mergePdfBuffers } from '../../utils/pdf-merge'

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

  const rawToken = getApsAccessToken(event)

  // Download all derivatives from all file groups in parallel
  const allDownloads = await Promise.all(
    fileGroups.map(group => downloadAllDerivatives(group.urn, group.derivatives, rawToken))
  )

  // --- Merge phase ---
  // Produces a list of groups, each with a name and files
  interface OutputGroup {
    name: string
    files: DerivativeFile[]
  }

  let outputGroups: OutputGroup[]

  if (options.mergeScope === 'all') {
    const allBuffers = allDownloads.flat()
    if (allBuffers.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No derivatives to export' })
    }
    const merged = await mergePdfBuffers(allBuffers.map(f => f.data))
    outputGroups = [{ name: 'merged', files: [{ name: 'merged.pdf', data: merged }] }]
  } else if (options.mergeScope === 'per-model') {
    outputGroups = await Promise.all(
      fileGroups.map(async (group, i) => {
        const files = allDownloads[i]!
        const groupName = sanitizeFolderName(group.name || `file-${i + 1}`)
        if (files.length === 0) return { name: groupName, files: [] as DerivativeFile[] }
        const merged = await mergePdfBuffers(files.map(f => f.data))
        return { name: groupName, files: [{ name: `${groupName}.pdf`, data: merged }] }
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

  // --- Package phase ---
  if (!options.zip) {
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

  // zip: true — single archive
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
