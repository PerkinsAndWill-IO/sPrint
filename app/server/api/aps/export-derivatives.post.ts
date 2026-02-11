import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { parseExportBody, sanitizeFolderName } from '../../utils/aps-download'

export default eventHandler(async (event) => {
  const body = await readBody(event)

  const result = parseExportBody(body)
  if ('error' in result) {
    throw createError({ statusCode: 400, statusMessage: result.error })
  }
  const { fileGroups } = result

  const rawToken = getApsAccessToken(event)

  // Download all derivatives from all file groups in parallel
  const allDownloads = await Promise.all(
    fileGroups.map(group => downloadAllDerivatives(group.urn, group.derivatives, rawToken))
  )

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="derivatives.zip"'
  })

  const archive = archiver('zip', { zlib: { level: 5 } })
  const passThrough = new PassThrough()

  archive.pipe(passThrough)

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

  archive.finalize()

  return sendStream(event, passThrough)
})
