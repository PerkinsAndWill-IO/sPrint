import type { Ref } from 'vue'
import type { ApsTreeItem, ApsRevitFile, RevitFileSSEEvent } from '~/types/aps'
import type { StoredExternalProject } from '~/utils/external-projects'
import {
  upsertStoredExternalProject,
  removeStoredExternalProject,
  buildStoredExternalProjectNode
} from '~/utils/external-projects'
import type { FavoriteProject } from '~/utils/favorites'
import { isFavorited, toggleFavoriteInList } from '~/utils/favorites'
import { shouldLoadChildren } from '~/utils/tree-loading'

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

export function findAndReplaceChildren(items: ApsTreeItem[], parentId: string, newChildren: ApsTreeItem[]): boolean {
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
  // MUST be a deep ref: UTree's nested branches only re-render when the
  // in-place child mutations (findAndReplaceChildren) are reactive — a
  // shallowRef here makes lazily loaded children invisible until the branch
  // is collapsed/re-expanded. The `as Ref` cast stops TypeScript from
  // recursing into UnwrapRef on the recursive tree type (TS2589).
  const items = ref<ApsTreeItem[]>([]) as Ref<ApsTreeItem[]>

  const expandedKeys = ref<string[]>([])
  const loading = ref(false)
  // Client-only metadata so added hubs/projects survive reloads; no auth material
  const storedExternalProjects = useLocalStorage<StoredExternalProject[]>('sprint:external-projects', [])
  const storedManualHubs = useLocalStorage<string[]>('sprint:manual-hubs', [])
  const favoriteProjects = useLocalStorage<FavoriteProject[]>('sprint:favorite-projects', [])
  const warnings = ref<string[]>([])
  const searchingProject = ref<string | null>(null)
  const searchProgress = ref('')
  const searchResults = ref<ApsRevitFile[]>([])
  const scannedFolders = ref(0)

  async function loadHubs() {
    loading.value = true
    warnings.value = []
    expandedKeys.value = []
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
      _projectName: project.name,
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
      _projectName: item._projectName ?? item.label,
      children: [makeLoadingPlaceholder(`folder-${folder.id}`)]
    }))

    findAndReplaceChildren(items.value, item._apsId, children)
    items.value = [...items.value]
  }

  async function loadFolderContents(item: ApsTreeItem, replaceTargetId?: string) {
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
          _projectName: item._projectName,
          children: [makeLoadingPlaceholder(`folder-${content.id}`)]
        }
      }
      return {
        label: content.name,
        icon: content.isRevitFile ? 'i-sprint-file-rvt' : 'i-lucide-file',
        _apsType: 'item',
        _apsId: `item-${content.id}`,
        _projectId: projectId,
        _region: item._region,
        _projectName: item._projectName
      }
    })

    findAndReplaceChildren(items.value, replaceTargetId ?? item._apsId, children.length > 0 ? children : [])
    items.value = [...items.value]
  }

  async function handleToggle(item: ApsTreeItem) {
    // Loads on any toggle of an unloaded node — see shouldLoadChildren for
    // why the toggle direction is ignored. _loading dedupes concurrent calls.
    if (!shouldLoadChildren(item)) return

    item._loading = true
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
            await loadFolderContents({ ...item, _apsId: `folder-${item._folderId}` }, item._apsId)
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
        label: 'Failed to load — collapse and expand to retry',
        icon: 'i-lucide-alert-circle',
        disabled: true,
        _apsType: 'loading',
        _apsId: `error-${item._apsId}`
      }])
      // findAndReplaceChildren marks the node loaded; undo so the next
      // toggle retries instead of hanging on the error placeholder
      item._loaded = false
      items.value = [...items.value]
    } finally {
      item._loading = false
    }
  }

  async function expandNode(node: ApsTreeItem) {
    if (!expandedKeys.value.includes(node._apsId)) {
      expandedKeys.value = [...expandedKeys.value, node._apsId]
    }
    // Programmatic expansion does not fire the tree's @toggle,
    // so trigger lazy loading manually
    if (!node._loaded) await handleToggle(node)
  }

  function clearSearchResults() {
    searchResults.value = []
    searchProgress.value = ''
    searchingProject.value = null
    scannedFolders.value = 0
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
    if (!items.value.some(i => i._apsId === node._apsId)) {
      items.value = [...items.value, node]
    }
    storedManualHubs.value = [...new Set([...storedManualHubs.value, id])]
    expandNode(node)
    return node
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
          _projectName: response.folderName,
          children: [makeLoadingPlaceholder(`folder-${content.id}`)]
        }
      }
      return {
        label: content.name,
        icon: content.isRevitFile ? 'i-sprint-file-rvt' : 'i-lucide-file',
        _apsType: 'item',
        _apsId: `item-${content.id}`,
        _projectId: parsed.projectId,
        _projectName: response.folderName
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
      _projectName: response.folderName,
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
      items.value = [...items.value, makeExternalHubNode([projectNode])]
    }
    items.value = [...items.value]

    // Show the new project immediately — children are already loaded
    for (const key of [externalHubId, projectNode._apsId]) {
      if (!expandedKeys.value.includes(key)) {
        expandedKeys.value = [...expandedKeys.value, key]
      }
    }

    storedExternalProjects.value = upsertStoredExternalProject(storedExternalProjects.value, {
      projectId: parsed.projectId,
      folderId: parsed.folderId,
      name: response.folderName
    })
  }

  function makeExternalHubNode(children: ApsTreeItem[]): ApsTreeItem {
    return {
      label: 'External Projects',
      icon: 'i-lucide-globe',
      _apsType: 'hub',
      _apsId: 'hub-external',
      _hubId: 'external',
      _loaded: true,
      children
    }
  }

  /**
   * Restores saved manual hubs and external projects after loadHubs()
   * replaced the tree. Builds lazy nodes only — no API calls.
   */
  function rehydrateStored() {
    try {
      for (const id of storedManualHubs.value) {
        if (typeof id !== 'string' || !id) continue
        const apsId = `hub-${id}`
        if (items.value.some(i => i._apsId === apsId)) continue
        items.value = [...items.value, {
          label: `Hub (${id})`,
          icon: 'i-lucide-building-2',
          _apsType: 'hub',
          _apsId: apsId,
          _hubId: id,
          children: [makeLoadingPlaceholder(apsId)]
        }]
      }

      const projectNodes = storedExternalProjects.value
        .filter(p => p && p.projectId && p.folderId)
        .map(buildStoredExternalProjectNode)
      if (projectNodes.length > 0) {
        let hub = items.value.find(i => i._apsId === 'hub-external')
        if (!hub) {
          hub = makeExternalHubNode([])
          items.value = [...items.value, hub]
        }
        for (const node of projectNodes) {
          if (!hub.children?.some(c => c._apsId === node._apsId)) {
            hub.children = [...(hub.children || []).filter(c => c._apsType !== 'loading'), node]
          }
        }
      }
      items.value = [...items.value]
    } catch (error) {
      console.error('Failed to restore saved hubs/projects:', error)
    }
  }

  function findNode(nodes: ApsTreeItem[], apsId: string): ApsTreeItem | undefined {
    for (const node of nodes) {
      if (node._apsId === apsId) return node
      const found = node.children && findNode(node.children, apsId)
      if (found) return found
    }
    return undefined
  }

  function favoriteApsId(f: FavoriteProject): string {
    return f.folderId ? `project-${f.projectId}-${f.folderId}` : `project-${f.projectId}`
  }

  function toggleFavorite(node: ApsTreeItem) {
    if (!node._projectId) return
    favoriteProjects.value = toggleFavoriteInList(favoriteProjects.value, {
      projectId: node._projectId,
      hubId: node._hubId,
      folderId: node._folderId,
      label: node.label || node._projectId,
      region: node._region
    })
  }

  function isFavorite(node: ApsTreeItem): boolean {
    if (!node._projectId) return false
    return isFavorited(favoriteProjects.value, { projectId: node._projectId, folderId: node._folderId })
  }

  /**
   * Expands the tree down to a favorited project, loading the hub's
   * projects on the way if needed. Returns the project node's key so the
   * caller can scroll/highlight it, or null if it can't be reached.
   */
  async function openFavorite(f: FavoriteProject): Promise<string | null> {
    const targetId = favoriteApsId(f)
    // External projects live under the synthetic external hub
    const hubKey = f.folderId ? 'hub-external' : f.hubId ? `hub-${f.hubId}` : null

    let node = findNode(items.value, targetId)
    if (!node && hubKey) {
      const hub = findNode(items.value, hubKey)
      if (hub) await expandNode(hub)
      node = findNode(items.value, targetId)
    }
    if (!node) return null

    // Hub must be expanded for the project row to be visible, even when
    // the project node was already loaded
    if (hubKey && !expandedKeys.value.includes(hubKey)) {
      expandedKeys.value = [...expandedKeys.value, hubKey]
    }
    await expandNode(node)
    return node._apsId
  }

  function removeExternalProject(node: ApsTreeItem) {
    storedExternalProjects.value = removeStoredExternalProject(storedExternalProjects.value, node._apsId)
    const hub = items.value.find(i => i._apsId === 'hub-external')
    if (hub) {
      hub.children = (hub.children || []).filter(c => c._apsId !== node._apsId)
      if (hub.children.length === 0) {
        items.value = items.value.filter(i => i._apsId !== 'hub-external')
      }
    }
    items.value = [...items.value]
  }

  return {
    items,
    expandedKeys,
    loading,
    warnings,
    searchingProject,
    searchProgress,
    searchResults,
    scannedFolders,
    loadHubs,
    handleToggle,
    expandNode,
    searchRevitFiles,
    clearSearchResults,
    addManualHub,
    addExternalProject,
    rehydrateStored,
    removeExternalProject,
    favoriteProjects,
    toggleFavorite,
    isFavorite,
    openFavorite
  }
}
