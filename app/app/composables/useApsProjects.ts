import type { ApsTreeItem, ApsRevitFile, RevitFileSSEEvent } from '~/types/aps'

function makeLoadingPlaceholder(parentId: string): ApsTreeItem {
  return {
    label: 'Loading...',
    icon: 'i-lucide-loader',
    disabled: true,
    _apsType: 'loading',
    _apsId: `loading-${parentId}`
  }
}

function findAndReplaceChildren(items: ApsTreeItem[], parentId: string, newChildren: ApsTreeItem[]): boolean {
  for (const item of items) {
    if (item._apsId === parentId) {
      item.children = newChildren
      item._loaded = true
      return true
    }
    if (item.children && findAndReplaceChildren(item.children, parentId, newChildren)) {
      return true
    }
  }
  return false
}

export function useApsProjects() {
  const items = ref<ApsTreeItem[]>([])
  const loading = ref(false)
  const warnings = ref<string[]>([])
  const searchingProject = ref<string | null>(null)
  const searchProgress = ref('')
  const searchResults = ref<ApsRevitFile[]>([])
  const scannedFolders = ref(0)

  async function loadHubs() {
    loading.value = true
    warnings.value = []
    try {
      const response = await $fetch('/api/aps/hubs')
      warnings.value = response.warnings || []
      items.value = response.hubs.map((hub): ApsTreeItem => ({
        label: hub.name,
        icon: 'i-lucide-building-2',
        _apsType: 'hub',
        _apsId: `hub-${hub.id}`,
        _hubId: hub.id,
        children: [makeLoadingPlaceholder(`hub-${hub.id}`)]
      }))
    } catch (error) {
      console.error('Failed to load hubs:', error)
    } finally {
      loading.value = false
    }
  }

  async function loadProjects(item: ApsTreeItem) {
    const hubId = item._hubId
    if (!hubId) return

    const projects = await $fetch('/api/aps/projects', { params: { hubId } })
    const children: ApsTreeItem[] = projects.map((project): ApsTreeItem => ({
      label: project.name,
      icon: 'i-lucide-folder-kanban',
      slot: 'project' as const,
      _apsType: 'project',
      _apsId: `project-${project.id}`,
      _hubId: hubId,
      _projectId: project.id,
      children: [makeLoadingPlaceholder(`project-${project.id}`)]
    }))

    findAndReplaceChildren(items.value, item._apsId, children)
    items.value = [...items.value]
  }

  async function loadTopFolders(item: ApsTreeItem) {
    const hubId = item._hubId
    const projectId = item._projectId
    if (!hubId || !projectId) return

    const folders = await $fetch('/api/aps/top-folders', { params: { hubId, projectId } })
    const children: ApsTreeItem[] = folders.map((folder): ApsTreeItem => ({
      label: folder.name,
      _apsType: 'folder',
      _apsId: `folder-${folder.id}`,
      _hubId: hubId,
      _projectId: projectId,
      children: [makeLoadingPlaceholder(`folder-${folder.id}`)]
    }))

    findAndReplaceChildren(items.value, item._apsId, children)
    items.value = [...items.value]
  }

  async function loadFolderContents(item: ApsTreeItem) {
    const projectId = item._projectId
    const folderId = item._apsId.replace('folder-', '')
    if (!projectId) return

    const contents = await $fetch('/api/aps/folder-contents', { params: { projectId, folderId } })
    const children: ApsTreeItem[] = contents.map((content): ApsTreeItem => {
      if (content.type === 'folders') {
        return {
          label: content.name,
          _apsType: 'folder',
          _apsId: `folder-${content.id}`,
          _hubId: item._hubId,
          _projectId: projectId,
          children: [makeLoadingPlaceholder(`folder-${content.id}`)]
        }
      }
      return {
        label: content.name,
        icon: content.isRevitFile ? 'i-lucide-file-box' : 'i-lucide-file',
        _apsType: 'item',
        _apsId: `item-${content.id}`,
        _projectId: projectId
      }
    })

    findAndReplaceChildren(items.value, item._apsId, children.length > 0 ? children : [])
    items.value = [...items.value]
  }

  async function handleToggle(item: ApsTreeItem, isExpanded: boolean) {
    // reka-ui reports isExpanded as the state BEFORE the toggle,
    // so isExpanded=false means the user is expanding the node
    if (isExpanded || item._loaded) return

    try {
      switch (item._apsType) {
        case 'hub':
          await loadProjects(item)
          break
        case 'project':
          await loadTopFolders(item)
          break
        case 'folder':
          await loadFolderContents(item)
          break
      }
    } catch {
      findAndReplaceChildren(items.value, item._apsId, [{
        label: 'Failed to load',
        icon: 'i-lucide-alert-circle',
        disabled: true,
        _apsType: 'loading',
        _apsId: `error-${item._apsId}`
      }])
      items.value = [...items.value]
    }
  }

  function searchRevitFiles(hubId: string, projectId: string) {
    searchingProject.value = projectId
    searchResults.value = []
    searchProgress.value = 'Starting search...'
    scannedFolders.value = 0

    const eventSource = new EventSource(`/api/aps/revit-files?hubId=${encodeURIComponent(hubId)}&projectId=${encodeURIComponent(projectId)}`)

    eventSource.onmessage = (event) => {
      const data: RevitFileSSEEvent = JSON.parse(event.data)

      switch (data.type) {
        case 'file':
          searchResults.value = [...searchResults.value, {
            id: data.id!,
            name: data.name!,
            path: data.path!
          }]
          break
        case 'progress':
          scannedFolders.value = data.scanned!
          searchProgress.value = `Scanning: ${data.folder} (${data.scanned} folders scanned)`
          break
        case 'done':
          searchProgress.value = ''
          searchingProject.value = null
          eventSource.close()
          break
        case 'error':
          searchProgress.value = `Error: ${data.message}`
          searchingProject.value = null
          eventSource.close()
          break
      }
    }

    eventSource.onerror = () => {
      searchProgress.value = 'Connection lost'
      searchingProject.value = null
      eventSource.close()
    }

    return eventSource
  }

  function addManualHub(hubId: string) {
    const id = hubId.startsWith('b.') ? hubId : `b.${hubId}`
    const node: ApsTreeItem = {
      label: `Hub (${id})`,
      icon: 'i-lucide-building-2',
      _apsType: 'hub',
      _apsId: `hub-${id}`,
      _hubId: id,
      children: [makeLoadingPlaceholder(`hub-${id}`)]
    }
    items.value = [node]
  }

  return {
    items,
    loading,
    warnings,
    searchingProject,
    searchProgress,
    searchResults,
    scannedFolders,
    loadHubs,
    handleToggle,
    searchRevitFiles,
    addManualHub
  }
}
