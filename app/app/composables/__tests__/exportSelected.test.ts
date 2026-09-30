import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref, shallowRef } from 'vue'
import { computeDownloadBaseName } from '../../utils/download-name'

const capture = vi.fn()
let derivatives: ReturnType<typeof import('../useDerivatives').useDerivatives>

beforeAll(async () => {
  for (const [name, value] of Object.entries({ computed, reactive, ref, shallowRef, computeDownloadBaseName })) vi.stubGlobal(name, value)
  vi.stubGlobal('useNuxtApp', () => ({ $posthog: () => ({ capture }) }))
  const { useDerivatives } = await import('../useDerivatives')
  derivatives = useDerivatives()
})

afterEach(() => {
  derivatives.clearAll()
  capture.mockClear()
})

afterAll(() => vi.unstubAllGlobals())

describe('exportSelected errors', () => {
  it('shows and captures the HTTP status when the server sends an empty statusText', async () => {
    derivatives.selectedFiles.set('model', {
      itemId: 'model', projectId: 'project', name: 'Interiors.rvt', urn: 'model',
      loading: false, error: null, viewSets: [], revitVersion: 2024, revitVersionSupported: true,
      derivatives: [{ guid: 'sheet', name: 'Sheet 1', urn: 'sheet.pdf', format: 'pdf', mimeType: 'application/pdf', viewSets: [], active: true }]
    })
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ statusMessage: 'Internal Server Error' }), { status: 500 }))

    await derivatives.exportSelected()

    expect(derivatives.exportError.value).toBe('Download failed (HTTP 500): Internal Server Error')
    expect(capture).toHaveBeenCalledWith('export_failed', expect.objectContaining({
      error: 'Download failed (HTTP 500): Internal Server Error', http_status: 500, file_count: 1, total_derivatives: 1
    }))
    expect(derivatives.exporting.value).toBe(false)
  })
})
