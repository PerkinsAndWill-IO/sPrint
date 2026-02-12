import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { parseExportBody, sanitizeFolderName } from '../../utils/aps-download'
import { mergePdfBuffers } from '../../utils/pdf-merge'

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

  // Collect all downloaded PDF buffers
  const allBuffers = allDownloads.flat()

  // Merge PDFs if requested
  let outputFiles = allBuffers
  if (options.mergePdfs && allBuffers.length > 0) {
    const mergedBuffer = await mergePdfBuffers(allBuffers.map(f => f.data))
    outputFiles = [{ name: 'merged.pdf', data: mergedBuffer }]
  }

  // Return raw PDF if zip is off and there's a single output file
  if (!options.zipOutput && outputFiles.length === 1) {
    setResponseHeaders(event, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="derivatives.pdf"'
    })
    return outputFiles[0].data
  }

  // Otherwise, return a ZIP archive
  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="derivatives.zip"'
  })

  const archive = archiver('zip', { zlib: { level: 5 } })
  const passThrough = new PassThrough()

  archive.pipe(passThrough)

  if (options.mergePdfs) {
    // Single merged file in the zip
    for (const file of outputFiles) {
      archive.append(file.data, { name: file.name })
    }
  } else {
    const isMultiFile = fileGroups.length > 1

    for (let i = 0; i < fileGroups.length; i++) {
      const files = allDownloads[i]
      const folderPrefix = isMultiFile
        ? `${sanitizeFolderName(fileGroups[i].name || `file-${i + 1}`)}/`
        : ''

      for (const file of files) {
        archive.append(file.data, { name: `${folderPrefix}${file.name}` })
      }
    }
  }

  archive.finalize()

  return sendStream(event, passThrough)
})
