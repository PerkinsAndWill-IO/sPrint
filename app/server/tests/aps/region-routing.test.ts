import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Telemetry } from '#shared/telemetry/telemetry'
import { APS_REGIONS } from '#shared/aps/region'
import { modelDerivativePath, regionHeader } from '../../utils/aps'
import { parseExportBody } from '../../utils/aps-download'
import { resolveHubRegion, resolveProjectRegion } from '../../utils/aps-region'

const MANIFEST = '/modelderivative/v2/designdata/dXJu/manifest'

describe('Model Derivative routing per region', () => {
  it('uses the EMEA-specific URI for EMEA only', () => {
    expect(modelDerivativePath(MANIFEST, 'EMEA')).toBe('/modelderivative/v2/regions/eu/designdata/dXJu/manifest')
    for (const region of APS_REGIONS.filter(r => r !== 'EMEA')) {
      expect(modelDerivativePath(MANIFEST, region)).toBe(MANIFEST)
    }
    expect(modelDerivativePath(MANIFEST, undefined)).toBe(MANIFEST)
  })

  it('sends the region header for every non-US region', () => {
    for (const region of APS_REGIONS.filter(r => r !== 'US')) {
      expect(regionHeader(region)).toEqual({ Region: region })
    }
    expect(regionHeader('US')).toEqual({})
    expect(regionHeader(undefined)).toEqual({})
  })
})

describe('parseExportBody region', () => {
  it('keeps each file group\'s region', () => {
    const result = parseExportBody({
      files: [
        { urn: 'a', derivatives: ['d1'], region: 'CAN' },
        { urn: 'b', derivatives: ['d2'] }
      ]
    })
    if ('error' in result) throw new Error(result.error)
    expect(result.fileGroups.map(g => g.region)).toEqual(['CAN', undefined])
  })
})

describe('region resolution', () => {
  const fakeLog = () => {
    const calls = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn(), captureException: vi.fn() }
    return { calls, log: calls as unknown as Telemetry }
  }
  const notFound = () => Object.assign(new Error('Not Found'), { status: 404 })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads a hub\'s region attribute', async () => {
    const fetch = vi.fn(async () => ({ data: { id: 'b.hub', attributes: { name: 'Hub', region: 'CAN' } } }))
    vi.stubGlobal('$fetch', fetch)
    const { calls, log } = fakeLog()
    await expect(resolveHubRegion('t', 'b.hub', log)).resolves.toEqual({ region: 'CAN', hubId: 'b.hub', source: 'hub' })
    expect(fetch).toHaveBeenCalledWith('https://developer.api.autodesk.com/project/v1/hubs/b.hub', expect.anything())
    expect(calls.info).toHaveBeenCalledWith('aps.region_resolved', expect.objectContaining({ region: 'CAN', source: 'hub' }))
  })

  it('finds the hub that holds a project and uses its region over the link hint', async () => {
    vi.stubGlobal('$fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/project/v1/hubs')) {
        return { data: [
          { id: 'b.pw', attributes: { name: 'PW Hub', region: 'US' } },
          { id: 'b.toronto', attributes: { name: 'Toronto', region: 'CAN' } },
          { id: 'a.personal', attributes: { name: 'Personal', region: 'US' } }
        ] }
      }
      if (url.endsWith('/project/v1/hubs/b.toronto/projects/b.proj')) return { data: { id: 'b.proj' } }
      throw notFound()
    }))
    const { calls, log } = fakeLog()
    await expect(resolveProjectRegion('t', 'b.proj', 'US', log)).resolves.toEqual({ region: 'CAN', hubId: 'b.toronto', source: 'hub' })
    // 404s from the other hubs are expected answers, not failures
    expect(calls.warn).not.toHaveBeenCalled()
    expect(calls.debug).toHaveBeenCalledWith('aps.probe_miss', expect.objectContaining({ aps_status: 404 }))
  })

  it('falls back to the link hint when no hub holds the project', async () => {
    vi.stubGlobal('$fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/project/v1/hubs')) return { data: [{ id: 'b.pw', attributes: { name: 'PW Hub', region: 'US' } }] }
      throw notFound()
    }))
    const { calls, log } = fakeLog()
    await expect(resolveProjectRegion('t', 'b.proj', 'JPN', log)).resolves.toEqual({ region: 'JPN', hubId: undefined, source: 'url' })
    expect(calls.info).toHaveBeenCalledWith('aps.region_resolved', expect.objectContaining({ region: 'JPN', source: 'url' }))
  })

  it('logs a rate-limited probe as a failure instead of a quiet miss', async () => {
    vi.stubGlobal('$fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/project/v1/hubs')) return { data: [{ id: 'b.pw', attributes: { name: 'PW Hub', region: 'US' } }] }
      throw Object.assign(new Error('Too Many Requests'), { status: 429 })
    }))
    const { calls, log } = fakeLog()
    await expect(resolveProjectRegion('t', 'b.proj', 'CAN', log)).resolves.toEqual({ region: 'CAN', hubId: undefined, source: 'url' })
    expect(calls.warn).toHaveBeenCalledWith('aps.request_failed', expect.objectContaining({ aps_status: 429 }))
  })

  it('never throws: an unreachable hub list with no hint resolves to unknown (US) and warns', async () => {
    vi.stubGlobal('$fetch', vi.fn(async () => {
      throw Object.assign(new Error('Forbidden'), { status: 403 })
    }))
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('x'), input))
    const { calls, log } = fakeLog()
    await expect(resolveProjectRegion('t', 'b.proj', undefined, log)).resolves.toEqual({ region: undefined, hubId: undefined, source: 'none' })
    expect(calls.warn).toHaveBeenCalledWith('aps.region_unresolved', expect.objectContaining({ fallback: 'US' }))
  })
})
