import type { ApsTreeItem, ApsRevitFile, RevitFileSSEEvent } from '~/types/aps'

function makeLoadingPlaceholder(parentId: string): ApsTreeItem {
  return {
    label: 'Loading...',
    icon: 'i-lucide-loader',
    slot: 'loading',
    disabled: true,
    _apsType: 'loading',
    _apsId: `loading-${parentId}`
  }
}

function findAndReplaceChildren(items: ApsTreeItem[], parentId: string, newChildren: ApsTreeItem[]): boolean {
  for (const item of items) {
    if (item._apsId === parentId) {
      if (newChildren.length === 0) {
        item.children = undefined
        if (!item.icon) item.icon = 'i-lucide-folder'
      } else {
        item.children = newChildren
      }
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
  const expandedKeys = ref<string[]>([])

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
        _region: hub.region,
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
      _region: item._region,
      children: [makeLoadingPlaceholder(`project-${project.id}`)]
    })).sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''))

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
      _region: item._region,
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
          _region: item._region,
          children: [makeLoadingPlaceholder(`folder-${content.id}`)]
        }
      }
      return {
        label: content.name,
        icon: content.isRevitFile ? 'i-lucide-file-box' : 'i-lucide-file',
        _apsType: 'item',
        _apsId: `item-${content.id}`,
        _projectId: projectId,
        _region: item._region
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
          // External hub has no real hub ID — skip loading projects
          if (item._hubId === 'external') return
          await loadProjects(item)
          break
        case 'project':
          // External projects already have children loaded, but if not, use folder contents
          if (item._folderId) {
            await loadFolderContents({ ...item, _apsId: `folder-${item._folderId}` })
          } else {
            await loadTopFolders(item)
          }
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

  function searchRevitFiles(hubId: string | undefined, projectId: string, folderId?: string) {
    searchingProject.value = projectId
    searchResults.value = []
    searchProgress.value = 'Starting search...'
    scannedFolders.value = 0

    const params = new URLSearchParams({ projectId })
    if (folderId) {
      params.set('folderId', folderId)
    } else if (hubId) {
      params.set('hubId', hubId)
    }

    const eventSource = new EventSource(`/api/aps/revit-files?${params.toString()}`)

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

  function parseBim360Url(url: string): { projectId: string, folderId: string } | null {
    return parseAccUrl(url)
  }

  async function addExternalProject(url: string) {
    const parsed = parseBim360Url(url)
    if (!parsed) throw new Error('Invalid BIM 360 / ACC URL')

    const response = await $fetch('/api/aps/project-info', {
        params: { projectId: parsed.projectId, folderId: parsed.folderId }
      })

      const children: ApsTreeItem[] = response.contents.map((content): ApsTreeItem => {
        if (content.type === 'folders') {
          return {
            label: content.name,
            _apsType: 'folder',
            _apsId: `folder-${content.id}`,
            _projectId: parsed.projectId,
            children: [makeLoadingPlaceholder(`folder-${content.id}`)]
          }
        }
        return {
          label: content.name,
          icon: content.isRevitFile ? 'i-lucide-file-box' : 'i-lucide-file',
          _apsType: 'item',
          _apsId: `item-${content.id}`,
          _projectId: parsed.projectId
        }
      })

      const projectNode: ApsTreeItem = {
        label: response.folderName,
        icon: 'i-lucide-folder-kanban',
        slot: 'project' as const,
        _apsType: 'project',
        _apsId: `project-${parsed.projectId}-${parsed.folderId}`,
        _projectId: parsed.projectId,
        _folderId: parsed.folderId,
        _loaded: true,
        children
      }

      // Find or create "External Projects" hub node
      const externalHubId = 'hub-external'
      const existingHub = items.value.find(i => i._apsId === externalHubId)
      if (existingHub) {
        if (!existingHub.children?.find(c => c._apsId === projectNode._apsId)) {
          existingHub.children = [...(existingHub.children || []).filter(c => c._apsType !== 'loading'), projectNode]
        }
      } else {
        const externalHub: ApsTreeItem = {
          label: 'External Projects',
          icon: 'i-lucide-globe',
          _apsType: 'hub',
          _apsId: externalHubId,
          _hubId: 'external',
          _loaded: true,
          children: [projectNode]
        }
        items.value = [...items.value, externalHub]
      }
      items.value = [...items.value]
  }

  async function navigateToProject(hubId: string, projectId: string, region?: string) {
    // Find the hub node
    const hubKey = `hub-${hubId}`
    const hubNode = items.value.find(i => i._apsId === hubKey)
    if (!hubNode) return

    // Load projects if not yet loaded
    if (!hubNode._loaded) {
      await loadProjects(hubNode)
    }

    // Find the project node
    const projectKey = `project-${projectId}`
    const projectNode = hubNode.children?.find(c => c._apsId === projectKey)
    if (!projectNode) return

    // Expand hub and project
    const newKeys = new Set(expandedKeys.value)
    newKeys.add(hubKey)
    newKeys.add(projectKey)
    expandedKeys.value = [...newKeys]
  }

  return {
    items,
    loading,
    warnings,
    searchingProject,
    searchProgress,
    searchResults,
    scannedFolders,
    expandedKeys,
    loadHubs,
    handleToggle,
    searchRevitFiles,
    addManualHub,
    addExternalProject,
    navigateToProject
  }
}
