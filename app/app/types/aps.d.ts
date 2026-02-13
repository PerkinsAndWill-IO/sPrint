import type { TreeItem } from '@nuxt/ui'

export interface ApsHub {
  id: string
  name: string
  region: string
}

export interface ApsProject {
  id: string
  name: string
  hubId: string
}

export interface ApsFolderContent {
  id: string
  name: string
  type: 'folders' | 'items'
  isRevitFile: boolean
}

export interface ApsRevitFile {
  id: string
  name: string
  path: string
}

export type ApsNodeType = 'hub' | 'project' | 'folder' | 'item' | 'loading'

export interface ApsTreeItem extends TreeItem {
  _apsType: ApsNodeType
  _apsId: string
  _projectId?: string
  _hubId?: string
  _loaded?: boolean
  children?: ApsTreeItem[]
}

export interface RevitFileSSEEvent {
  type: 'file' | 'progress' | 'done' | 'error'
  name?: string
  id?: string
  path?: string
  folder?: string
  scanned?: number
  total?: number
  message?: string
}
