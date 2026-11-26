import { useLocalStorage } from '@vueuse/core'
import type { ExportOptions, SelectedFileState } from '~/types/derivatives'
import { orderDerivativesForExport, type PdfSort } from '~/utils/sort-pdf-derivatives'

// Module-scope shared state — all callers of useDerivatives() share the same refs
const selectedFiles = reactive(new Map<string, SelectedFileState>())
const exporting = ref(false)
const exportError = ref<string | null>(null)
const downloadComplete = ref(false)
const pdfSort = import.meta.client
  ? useLocalStorage<PdfSort>('sprint:pdf-sort', 'number-asc')
  : shallowRef<PdfSort>('number-asc')
const exportOptions = reactive<ExportOptions>({
  mergeScope: 'none',
  zip: true,
  modelFolders: true
})

export function useDerivatives() {
  const selectedFilesList = computed(() => Array.from(selectedFiles.values()))

  const totalSelectedCount = computed(() =>
    selectedFilesList.value.reduce(
      (sum, file) => sum + file.derivatives.filter(d => d.active).length,
      0
    )
  )

  const hasSelections = computed(() => totalSelectedCount.value > 0)

  async function addFile(itemId: string, projectId: string, name: string, region?: string, projectName?: string) {
    if (selectedFiles.has(itemId)) return

    selectedFiles.set(itemId, {
      itemId,
      projectId,
      projectName,
      name,
      urn: '',
      region,
      loading: true,
      error: null,
      derivatives: [],
      viewSets: [],
      revitVersion: null,
      revitVersionSupported: false
    })

    const started = performance.now()
    let stage = 'item-urn'
    try {
      const itemResult = await api('/api/aps/item-urn', {
        params: { projectId, itemId, region }
      })

      const entry = selectedFiles.get(itemId)
      if (!entry) return
      entry.urn = itemResult.urn
      entry.name = itemResult.name || name
      entry.lastModifiedTime = itemResult.lastModifiedTime

      stage = 'manifest'
      const manifestResult = await api('/api/aps/manifest', {
        params: { urn: itemResult.urn, region }
      })

      entry.derivatives = manifestResult.derivatives
      entry.viewSets = manifestResult.viewSets
      entry.revitVersion = manifestResult.revitVersion
      entry.revitVersionSupported = manifestResult.revitVersionSupported

      // Only flag unsupported versions when there is content; an empty
      // manifest (nothing published) should show the empty state instead
      if (!manifestResult.revitVersionSupported && manifestResult.derivatives.length > 0) {
        entry.error = `Revit version ${manifestResult.revitVersion || 'unknown'} is not supported. Requires 2022 or later.`
      }

      useTelemetry().track('file_selected', {
        project_id: projectId,
        region,
        derivative_count: manifestResult.derivatives.length,
        pdf_count: manifestResult.derivatives.filter(d => d.format === 'pdf').length,
        view_set_count: manifestResult.viewSets.length,
        revit_version: manifestResult.revitVersion,
        revit_version_supported: manifestResult.revitVersionSupported,
        duration_ms: Math.round(performance.now() - started)
      })
    } catch (e: unknown) {
      reportFailure('file.load_failed', { project_id: projectId, item_id: itemId, region, stage }, e)
      const entry = selectedFiles.get(itemId)
      if (entry) {
        entry.error = e instanceof Error ? e.message : 'Failed to load manifest'
      }
    } finally {
      const entry = selectedFiles.get(itemId)
      if (entry) {
        entry.loading = false
      }
    }
  }

  function removeFile(itemId: string) {
    selectedFiles.delete(itemId)
  }

  function isFileSelected(itemId: string) {
    return selectedFiles.has(itemId)
  }

  function toggleFile(itemId: string, projectId: string, name: string, region?: string, projectName?: string) {
    if (selectedFiles.has(itemId)) {
      removeFile(itemId)
    } else {
      addFile(itemId, projectId, name, region, projectName)
    }
  }

  function toggleDerivative(itemId: string, guid: string) {
    const entry = selectedFiles.get(itemId)
    if (!entry) return
    const d = entry.derivatives.find(d => d.guid === guid)
    if (d) d.active = !d.active
  }

  function toggleViewSet(itemId: string, name: string) {
    const entry = selectedFiles.get(itemId)
    if (!entry) return
    const viewSet = entry.viewSets.find(v => v.name === name)
    if (!viewSet) return
    const setDerivatives = entry.derivatives.filter(d => d.viewSets.includes(name))
    const allActive = setDerivatives.length > 0 && setDerivatives.every(d => d.active)
    const newActive = !allActive
    viewSet.active = newActive
    for (const d of setDerivatives) {
      d.active = newActive
    }
  }

  function setActiveForFile(itemId: string, active: boolean, guids?: string[]) {
    const entry = selectedFiles.get(itemId)
    if (!entry) return
    const guidSet = guids ? new Set(guids) : null
    for (const d of entry.derivatives) {
      if (!guidSet || guidSet.has(d.guid)) d.active = active
    }
    if (!guidSet) {
      for (const v of entry.viewSets) v.active = active
    }
  }

  function selectAllForFile(itemId: string, guids?: string[]) {
    setActiveForFile(itemId, true, guids)
  }

  function deselectAllForFile(itemId: string, guids?: string[]) {
    setActiveForFile(itemId, false, guids)
  }

  async function exportSelected() {
    const filesToExport = selectedFilesList.value
      .map(file => ({
        urn: file.urn,
        derivatives: orderDerivativesForExport(
          file.derivatives.filter(d => d.active),
          pdfSort.value
        ).map(d => ({ urn: d.urn, name: d.name })),
        name: file.name.replace(/\.rvt$/i, ''),
        projectName: file.projectName,
        // Per model: a selection can span hubs in different regions
        region: file.region
      }))
      .filter(f => f.derivatives.length > 0)

    if (filesToExport.length === 0) return

    const downloadBaseName = computeDownloadBaseName(filesToExport)

    exporting.value = true
    exportError.value = null
    downloadComplete.value = false

    const telemetry = useTelemetry()
    const regions = [...new Set(filesToExport.map(f => f.region).filter(Boolean))]
    const exportRegion = regions[0]
    const exportContext = {
      file_count: filesToExport.length,
      total_derivatives: filesToExport.reduce((sum, f) => sum + f.derivatives.length, 0),
      merge_scope: exportOptions.mergeScope,
      zip: exportOptions.zip,
      region: exportRegion,
      regions
    }
    telemetry.track('export_started', exportContext)
    const started = performance.now()

    let httpStatus: number | undefined
    try {
      const response = await fetch('/api/aps/export-derivatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToExport,
          filename: downloadBaseName,
          options: { mergeScope: exportOptions.mergeScope, zip: exportOptions.zip, modelFolders: exportOptions.modelFolders }
        })
      })
      httpStatus = response.status
      if (response.status === 401) {
        telemetry.track('export_failed', { ...exportContext, error: 'session expired', http_status: 401 })
        await $fetch('/api/auth/logout')
        navigateTo('/', { external: true })
        return
      }
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const detail = body && typeof body === 'object' && 'statusMessage' in body && typeof body.statusMessage === 'string'
          ? body.statusMessage
          : response.statusText
        throw new Error(`Download failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentType = response.headers.get('Content-Type') || ''
      // Client-computed name wins (avoids non-ASCII header issues);
      // Content-Disposition is the fallback for unexpected content types
      let filename = `${downloadBaseName}.zip`
      if (contentType.includes('application/pdf')) {
        filename = `${downloadBaseName}.pdf`
      } else if (!contentType.includes('application/zip')) {
        const disposition = response.headers.get('Content-Disposition') || ''
        const match = disposition.match(/filename="?([^";\s]+)"?/)
        if (match) filename = match[1]!
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      downloadComplete.value = true
      telemetry.track('export_completed', {
        ...exportContext,
        format: contentType.includes('application/pdf') ? 'pdf' : 'zip',
        size_bytes: blob.size,
        duration_ms: Math.round(performance.now() - started)
      })
    } catch (e: unknown) {
      exportError.value = e instanceof Error ? e.message : 'Download failed'
      const failure = {
        ...exportContext,
        error: exportError.value,
        http_status: httpStatus,
        duration_ms: Math.round(performance.now() - started)
      }
      telemetry.track('export_failed', failure)
      telemetry.error('export.failed', failure)
    } finally {
      exporting.value = false
    }
  }

  function getPreviewUrl(itemId: string, derivativeUrn: string, mimeType?: string): string | null {
    const entry = selectedFiles.get(itemId)
    if (!entry?.urn) return null
    let url = `/api/aps/derivative?urn=${encodeURIComponent(entry.urn)}&derivativeUrn=${encodeURIComponent(derivativeUrn)}`
    if (mimeType) url += `&mimeType=${encodeURIComponent(mimeType)}`
    if (entry.region) url += `&region=${encodeURIComponent(entry.region)}`
    const derivative = entry.derivatives.find(d => d.urn === derivativeUrn)
    if (derivative?.name) url += `&name=${encodeURIComponent(derivative.name)}`
    return url
  }

  function clearAll() {
    selectedFiles.clear()
    exporting.value = false
    exportError.value = null
    downloadComplete.value = false
  }

  return {
    selectedFiles,
    selectedFilesList,
    totalSelectedCount,
    hasSelections,
    exporting,
    exportError,
    downloadComplete,
    pdfSort,
    addFile,
    removeFile,
    isFileSelected,
    toggleFile,
    toggleDerivative,
    toggleViewSet,
    selectAllForFile,
    deselectAllForFile,
    exportOptions,
    exportSelected,
    getPreviewUrl,
    clearAll
  }
}
