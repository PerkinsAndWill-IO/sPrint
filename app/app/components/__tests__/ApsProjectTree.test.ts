import { describe, it, expect } from 'vitest'
import type { ApsTreeItem } from '~/types/aps'

// Replicate the component's pure logic for testing
function isRvtItem(item: ApsTreeItem): boolean {
  return item._apsType === 'item' && !!item.label?.toLowerCase().endsWith('.rvt')
}

function getItemId(item: ApsTreeItem): string {
  return item._apsId.replace('item-', '')
}

// Replicate how the composable builds project items
function buildProjectItem(overrides: Partial<ApsTreeItem> = {}): ApsTreeItem {
  return {
    label: 'Test Project',
    icon: 'i-lucide-folder-kanban',
    slot: 'project' as const,
    _apsType: 'project',
    _apsId: 'project-proj-123',
    _hubId: 'b.hub-456',
    _projectId: 'proj-123',
    children: [{
      label: 'Loading...',
      icon: 'i-lucide-loader',
      disabled: true,
      _apsType: 'loading',
      _apsId: 'loading-project-proj-123'
    }],
    ...overrides
  }
}

function buildRvtItem(overrides: Partial<ApsTreeItem> = {}): ApsTreeItem {
  return {
    label: 'Model.rvt',
    icon: 'i-lucide-file-box',
    _apsType: 'item',
    _apsId: 'item-file-789',
    _projectId: 'proj-123',
    ...overrides
  }
}

function buildFolderItem(): ApsTreeItem {
  return {
    label: 'Plans',
    _apsType: 'folder',
    _apsId: 'folder-fold-001',
    _hubId: 'b.hub-456',
    _projectId: 'proj-123',
    children: []
  }
}

function buildHubItem(): ApsTreeItem {
  return {
    label: 'My Hub',
    icon: 'i-lucide-building-2',
    _apsType: 'hub',
    _apsId: 'hub-b.hub-456',
    _hubId: 'b.hub-456',
    children: []
  }
}

// Replicate the component's filterTree function for testing
function filterTree(nodes: ApsTreeItem[], query: string): ApsTreeItem[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  return nodes.reduce<ApsTreeItem[]>((acc, node) => {
    const labelMatch = node.label?.toLowerCase().includes(q)
    const filteredChildren = node.children ? filterTree(node.children, query) : []
    if (labelMatch || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children })
    }
    return acc
  }, [])
}

describe('filterTree', () => {
  it('returns all items when query is empty', () => {
    const items = [buildHubItem(), buildProjectItem()]
    expect(filterTree(items, '')).toBe(items)
  })

  it('matches items by label substring (case-insensitive)', () => {
    const items = [
      buildHubItem(),
      { ...buildProjectItem(), label: 'Alpha Project' },
      { ...buildProjectItem(), label: 'Beta Project', _apsId: 'project-beta' }
    ]
    const result = filterTree(items, 'alpha')
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Alpha Project')
  })

  it('preserves parent path to matching descendants', () => {
    const hub: ApsTreeItem = {
      ...buildHubItem(),
      children: [
        {
          ...buildProjectItem(),
          label: 'Unrelated',
          _apsId: 'project-unrelated',
          children: [{ ...buildRvtItem(), label: 'DeepMatch.rvt', _apsId: 'item-deep' }]
        }
      ]
    }
    const result = filterTree([hub], 'DeepMatch')
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('My Hub')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].label).toBe('Unrelated')
    expect(result[0].children![0].children).toHaveLength(1)
    expect(result[0].children![0].children![0].label).toBe('DeepMatch.rvt')
  })

  it('returns empty array when nothing matches', () => {
    const items = [buildHubItem(), buildProjectItem()]
    expect(filterTree(items, 'zzz-no-match')).toEqual([])
  })
})

describe('ApsProjectTree logic', () => {
  describe('project items have slot property for #project-trailing', () => {
    it('project item has slot: "project"', () => {
      const project = buildProjectItem()
      expect(project.slot).toBe('project')
    })

    it('non-project items do not have slot: "project"', () => {
      const rvt = buildRvtItem()
      const folder = buildFolderItem()
      const hub = buildHubItem()

      expect(rvt.slot).toBeUndefined()
      expect(folder.slot).toBeUndefined()
      expect(hub.slot).toBeUndefined()
    })
  })

  describe('project items have required IDs for search', () => {
    it('project item has _hubId and _projectId', () => {
      const project = buildProjectItem()
      expect(project._hubId).toBeTruthy()
      expect(project._projectId).toBeTruthy()
    })

    it('search is skipped when hubId is missing', () => {
      const project = buildProjectItem({ _hubId: undefined })
      // Replicate onSearchRevitFiles guard
      const canSearch = !!(project._hubId && project._projectId)
      expect(canSearch).toBe(false)
    })

    it('search is skipped when projectId is missing', () => {
      const project = buildProjectItem({ _projectId: undefined })
      const canSearch = !!(project._hubId && project._projectId)
      expect(canSearch).toBe(false)
    })

    it('search proceeds when both IDs are present', () => {
      const project = buildProjectItem()
      const canSearch = !!(project._hubId && project._projectId)
      expect(canSearch).toBe(true)
    })
  })

  describe('isRvtItem', () => {
    it('returns true for .rvt items', () => {
      expect(isRvtItem(buildRvtItem())).toBe(true)
    })

    it('is case insensitive for .RVT extension', () => {
      expect(isRvtItem(buildRvtItem({ label: 'Model.RVT' }))).toBe(true)
    })

    it('returns false for project items', () => {
      expect(isRvtItem(buildProjectItem())).toBe(false)
    })

    it('returns false for non-rvt file items', () => {
      expect(isRvtItem(buildRvtItem({ label: 'file.dwg' }))).toBe(false)
    })

    it('returns false for folders', () => {
      expect(isRvtItem(buildFolderItem())).toBe(false)
    })
  })

  describe('getItemId', () => {
    it('strips item- prefix from _apsId', () => {
      expect(getItemId(buildRvtItem())).toBe('file-789')
    })
  })

  describe('button visibility logic', () => {
    it('shows button when searchingProject does not match this project', () => {
      const project = buildProjectItem()
      const searchingProject: string | null = null
      // Template condition: searchingProject !== project._projectId
      expect(searchingProject !== project._projectId).toBe(true)
    })

    it('shows scanning indicator when searchingProject matches this project', () => {
      const project = buildProjectItem()
      const searchingProject = 'proj-123'
      expect(searchingProject !== project._projectId).toBe(false)
    })

    it('shows button when a different project is being searched', () => {
      const project = buildProjectItem()
      const searchingProject = 'other-project'
      expect(searchingProject !== project._projectId).toBe(true)
    })
  })
})
