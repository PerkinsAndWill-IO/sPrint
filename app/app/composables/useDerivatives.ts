import type { ExportOptions, SelectedFileState } from '~/types/derivatives'

// Module-scope shared state — all callers of useDerivatives() share the same refs
const selectedFiles = reactive(new Map<string, SelectedFileState>())
const exporting = ref(false)
const exportError = ref<string | null>(null)
const downloadComplete = ref(false)
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

  async function addFile(itemId: string, projectId: string, name: string, region?: string) {
    if (selectedFiles.has(itemId)) return

    selectedFiles.set(itemId, {
      itemId,
      projectId,
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

    try {
      const itemResult = await $fetch('/api/aps/item-urn', {
        params: { projectId, itemId }
      })

      const entry = selectedFiles.get(itemId)
      if (!entry) return
      entry.urn = itemResult.urn
      entry.name = itemResult.name || name

      const manifestResult = await $fetch('/api/aps/manifest', {
        params: { urn: itemResult.urn, region }
      })

      entry.derivatives = manifestResult.derivatives
      entry.viewSets = manifestResult.viewSets
      entry.revitVersion = manifestResult.revitVersion
      entry.revitVersionSupported = manifestResult.revitVersionSupported

      if (!manifestResult.revitVersionSupported) {
        entry.error = `Revit version ${manifestResult.revitVersion || 'unknown'} is not supported. Requires 2022 or later.`
      }
    } catch (e: unknown) {
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

  function toggleFile(itemId: string, projectId: string, name: string, region?: string) {
    if (selectedFiles.has(itemId)) {
      removeFile(itemId)
    } else {
      addFile(itemId, projectId, name, region)
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
        derivatives: file.derivatives.filter(d => d.active).map(d => d.urn),
        name: file.name.replace(/\.rvt$/i, '')
      }))
      .filter(f => f.derivatives.length > 0)

    if (filesToExport.length === 0) return

    exporting.value = true
    exportError.value = null
    downloadComplete.value = false

    // Track export started
    const { $posthog } = useNuxtApp()
    const posthog = $posthog?.()
    posthog?.capture('export_started', {
      file_count: filesToExport.length,
      total_derivatives: filesToExport.reduce((sum, f) => sum + f.derivatives.length, 0),
      merge_scope: exportOptions.mergeScope,
      zip: exportOptions.zip
    })

    try {
      const regions = selectedFilesList.value.map(f => f.region).filter(Boolean)
      const exportRegion = regions.length > 0 ? regions[0] : undefined

      const response = await fetch('/api/aps/export-derivatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToExport,
          region: exportRegion,
          options: { mergeScope: exportOptions.mergeScope, zip: exportOptions.zip, modelFolders: exportOptions.modelFolders }
        })
      })
      if (response.status === 401) {
        await $fetch('/api/auth/logout')
        navigateTo('/', { external: true })
        return
      }
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentType = response.headers.get('Content-Type') || ''
      let filename = 'derivatives.zip'
      if (contentType.includes('application/pdf')) {
        filename = 'derivatives.pdf'
      } else if (contentType.includes('application/zip')) {
        filename = 'derivatives.zip'
      } else {
        // Extract filename from Content-Disposition if available
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
      posthog?.capture('export_completed', {
        file_count: filesToExport.length,
        total_derivatives: filesToExport.reduce((sum, f) => sum + f.derivatives.length, 0),
        format: contentType.includes('application/pdf') ? 'pdf' : 'zip'
      })
    } catch (e: unknown) {
      exportError.value = e instanceof Error ? e.message : 'Export failed'
      posthog?.capture('export_failed', {
        error: e instanceof Error ? e.message : 'Export failed'
      })
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
