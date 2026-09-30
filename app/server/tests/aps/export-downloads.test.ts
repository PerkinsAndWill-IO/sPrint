// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { inflateRawSync } from 'node:zlib'
import { createApp, createError, eventHandler, getCookie, readBody, sendStream, setResponseHeaders, toNodeListener } from 'h3'
import { PDFDocument } from 'pdf-lib'
import { getApsAccessToken, modelDerivativePath, regionHeader } from '../../utils/aps'
import { downloadAllDerivatives } from '../../utils/aps-download'
import { mergePdfBuffers } from '../../utils/pdf-merge'

const nativeFetch = globalThis.fetch
const networkDelay = process.env.SPRINT_EXPORT_BENCHMARK ? 20 : 2
let server: Server
let endpoint: string
let active = 0
let peak = 0
let downloaded = 0
let startedDownloads = 0
let failSheet: number | undefined
let fixtures: Uint8Array[]

beforeAll(async () => {
  // Supply Nitro's framework auto-imports, keeping the endpoint and APS code real.
  for (const [name, value] of Object.entries({ createError, eventHandler, getCookie, readBody, sendStream, setResponseHeaders, getApsAccessToken, modelDerivativePath, regionHeader, downloadAllDerivatives })) {
    vi.stubGlobal(name, value)
  }
  const { default: handler } = await import('../../api/aps/export-derivatives.post')
  const app = createApp()
  app.use('/api/aps/export-derivatives', handler)
  server = createServer(toNodeListener(app))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server address')
  endpoint = `http://127.0.0.1:${address.port}/api/aps/export-derivatives`
  fixtures = await Promise.all([201, 202, 203].map(async (width) => {
    const pdf = await PDFDocument.create()
    pdf.addPage([width, 300])
    return pdf.save()
  }))
})

beforeEach(() => {
  active = 0
  peak = 0
  downloaded = 0
  startedDownloads = 0
  failSheet = undefined
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.startsWith('http://127.0.0.1:')) return nativeFetch(input, init)
    // Model an upstream socket limit, including the time spent reading bodies.
    if (active >= 64) {
      throw new TypeError('fetch failed', { cause: Object.assign(new Error('Too many open files'), { code: 'EMFILE' }) })
    }
    active++
    peak = Math.max(peak, active)
    const signed = url.includes('/signedcookies')
    const index = Number(decodeURIComponent(url).match(/sheet-(\d+)\.pdf/)?.[1])
    if (!signed) startedDownloads++
    if (!signed && index === failSheet) {
      await delay(2)
      active--
      throw new Error('Upstream download unavailable')
    }
    const response = signed
      ? new Response(JSON.stringify({ url: `https://cdn.example.com/sheet-${index}.pdf` }), {
          headers: { 'set-cookie': 'CloudFront-Policy=p;Path=/, CloudFront-Key-Pair-Id=k;Path=/, CloudFront-Signature=s;Path=/' }
        })
      : new Response(Buffer.from(fixtures[index % 3]!), { headers: { 'Content-Type': 'application/pdf' } })
    if (signed) {
      const json = response.json.bind(response)
      response.json = async () => {
        await delay(networkDelay)
        active--
        return json()
      }
    } else {
      const arrayBuffer = response.arrayBuffer.bind(response)
      response.arrayBuffer = async () => {
        await delay(networkDelay)
        active--
        downloaded++
        return arrayBuffer()
      }
    }
    return response
  })
})

afterEach(async () => {
  await delay(20)
  vi.stubGlobal('fetch', nativeFetch)
})

afterAll(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  vi.unstubAllGlobals()
})

function exportRequest(count: number) {
  return {
    files: [{ urn: 'model', name: 'Interiors', derivatives: Array.from({ length: count }, (_, i) => ({ urn: `output/sheet-${i}.pdf`, name: `Sheet ${i}` })) }],
    filename: 'Interiors',
    options: { mergeScope: 'none', zip: false }
  }
}

async function postExport(body: ReturnType<typeof exportRequest>) {
  return nativeFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': 'aps_access_token=test-token' },
    body: JSON.stringify(body)
  })
}

function unzip(archive: Buffer) {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = archive.readUInt16LE(end + 10)
  let offset = archive.readUInt32LE(end + 16)
  const entries: Array<{ name: string, data: Buffer }> = []
  for (let i = 0; i < count; i++) {
    const size = archive.readUInt32LE(offset + 20)
    const nameLength = archive.readUInt16LE(offset + 28)
    const local = archive.readUInt32LE(offset + 42)
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28)
    const compressed = archive.subarray(start, start + size)
    entries.push({
      name: archive.toString('utf8', offset + 46, offset + 46 + nameLength),
      data: archive.readUInt16LE(offset + 10) === 8 ? inflateRawSync(compressed) : compressed
    })
    offset += 46 + nameLength + archive.readUInt16LE(offset + 30) + archive.readUInt16LE(offset + 32)
  }
  return entries
}

describe('large PDF exports over HTTP', () => {
  it('preserves distinct sheets with identical names when extracting a ZIP', async () => {
    const body = exportRequest(3)
    body.options.zip = true
    body.files[0]!.derivatives.forEach((sheet, i) => {
      sheet.name = i === 2 ? 'Partition charts (2)' : 'Partition charts'
    })
    const response = await postExport(body)
    expect(response.status).toBe(200)
    const entries = unzip(Buffer.from(await response.arrayBuffer()))
    expect(new Set(entries.map(entry => entry.name)).size).toBe(3)
    expect(entries.map(entry => entry.name)).toEqual(['Partition charts.pdf', 'Partition charts (3).pdf', 'Partition charts (2).pdf'])
    for (const [i, entry] of entries.entries()) {
      const pdf = await PDFDocument.load(entry.data)
      expect(pdf.getPage(0).getWidth()).toBe([201, 202, 203][i])
    }
  })

  it('exports all 644 sheets in selection order without exhausting upstream sockets', async () => {
    const response = await postExport(exportRequest(644))
    expect(response.status).toBe(200)
    const pdf = await PDFDocument.load(await response.arrayBuffer())
    expect(pdf.getPageCount()).toBe(644)
    expect(pdf.getPages().every((page, i) => page.getWidth() === [201, 202, 203][i % 3])).toBe(true)
    expect(downloaded).toBe(644)
    expect(peak).toBeGreaterThan(1)
  })

  it('stops queued work on failure and frees capacity for the next export', async () => {
    failSheet = 0
    const response = await postExport(exportRequest(644))
    expect(response.status).toBe(500)
    await vi.waitFor(() => expect(active).toBe(0), { interval: 5 })
    expect(startedDownloads).toBeLessThanOrEqual(64)

    failSheet = undefined
    const retry = await postExport(exportRequest(3))
    expect(retry.status).toBe(200)
    const pdf = await PDFDocument.load(await retry.arrayBuffer())
    expect(pdf.getPageCount()).toBe(3)
  })

  it('streams a ZIP containing all 644 complete PDFs with their selected names', async () => {
    const body = exportRequest(644)
    body.options.zip = true
    const response = await postExport(body)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/zip')
    const entries = unzip(Buffer.from(await response.arrayBuffer()))
    expect(entries).toHaveLength(644)
    expect(entries[0]?.name).toBe('Sheet 0.pdf')
    expect(entries[643]?.name).toBe('Sheet 643.pdf')
    for (const [i, entry] of entries.entries()) {
      const pdf = await PDFDocument.load(entry.data)
      expect(pdf.getPageCount()).toBe(1)
      expect(pdf.getPage(0).getWidth()).toBe([201, 202, 203][i % 3])
    }
  })

  it('shares capacity across models and simultaneous 644-sheet exports', async () => {
    const body = exportRequest(644)
    const sheets = body.files[0]!.derivatives
    body.files = Array.from({ length: 4 }, (_, i) => ({ urn: `model-${i}`, name: `Model ${i}`, derivatives: sheets.slice(i * 161, (i + 1) * 161) }))
    const responses = await Promise.all([postExport(body), postExport(body)])
    for (const response of responses) {
      expect(response.status).toBe(200)
      const pdf = await PDFDocument.load(await response.arrayBuffer())
      expect(pdf.getPageCount()).toBe(644)
      expect(pdf.getPages().every((page, i) => page.getWidth() === [201, 202, 203][i % 3])).toBe(true)
    }
    expect(downloaded).toBe(1288)
  })

  it.skipIf(!process.env.SPRINT_EXPORT_BENCHMARK)('benchmarks 644 sheets against serial downloads', async () => {
    const body = exportRequest(644)
    const start = performance.now()
    const response = await postExport(body)
    expect(response.status).toBe(200)
    await response.arrayBuffer()
    const parallelMs = performance.now() - start

    const serialStart = performance.now()
    const buffers: Buffer[] = []
    for (const derivative of body.files[0]!.derivatives) {
      const files = await downloadAllDerivatives('model', [derivative], 'test-token')
      buffers.push(files[0]!.data)
    }
    const serialPdf = await PDFDocument.load(await mergePdfBuffers(buffers))
    expect(serialPdf.getPageCount()).toBe(644)
    const serialMs = performance.now() - serialStart
    console.info(JSON.stringify({ sheets: 644, latencyPerRequestMs: networkDelay, parallelMs: Math.round(parallelMs), serialMs: Math.round(serialMs), speedup: Number((serialMs / parallelMs).toFixed(1)), peakConcurrentRequests: peak }))
  }, 60000)
})
