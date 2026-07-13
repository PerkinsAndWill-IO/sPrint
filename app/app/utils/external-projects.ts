import type { ApsTreeItem } from '~/types/aps'

export interface StoredExternalProject {
  projectId: string
  folderId: string
  name: string
  region?: string
}

export function externalProjectApsId(p: Pick<StoredExternalProject, 'projectId' | 'folderId'>): string {
  return `project-${p.projectId}-${p.folderId}`
}

export function upsertStoredExternalProject(
  list: StoredExternalProject[],
  project: StoredExternalProject
): StoredExternalProject[] {
  const withoutExisting = list.filter(
    p => !(p.projectId === project.projectId && p.folderId === project.folderId)
  )
  return [...withoutExisting, project]
}

export function removeStoredExternalProject(
  list: StoredExternalProject[],
  apsId: string
): StoredExternalProject[] {
  return list.filter(p => externalProjectApsId(p) !== apsId)
}

/**
 * Rebuilds a stored external project as a lazy tree node — contents load
 * on expand via the normal folder-contents path, no API calls at startup.
 */
export function buildStoredExternalProjectNode(p: StoredExternalProject): ApsTreeItem {
  const apsId = externalProjectApsId(p)
  return {
    label: p.name,
    icon: 'i-lucide-folder-kanban',
    slot: 'project' as const,
    _apsType: 'project',
    _apsId: apsId,
    _projectId: p.projectId,
    _folderId: p.folderId,
    _region: p.region,
    _projectName: p.name,
    _loaded: false,
    children: [{
      label: 'Loading...',
      icon: 'i-lucide-loader',
      slot: 'loading',
      disabled: true,
      _apsType: 'loading',
      _apsId: `loading-${apsId}`
    }]
  }
}
