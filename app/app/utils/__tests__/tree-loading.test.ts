import { describe, it, expect } from 'vitest'
import { shouldLoadChildren } from '~/utils/tree-loading'
import type { ApsTreeItem } from '~/types/aps'

function node(overrides: Partial<ApsTreeItem> = {}): ApsTreeItem {
  return {
    label: 'Test Project',
    _apsType: 'project',
    _apsId: 'project-proj-123',
    _projectId: 'proj-123',
    children: [{
      label: 'Loading...',
      disabled: true,
      _apsType: 'loading',
      _apsId: 'loading-project-proj-123'
    }],
    ...overrides
  }
}

describe('shouldLoadChildren (first-expand lazy loading)', () => {
  it('loads an unloaded project on first toggle, regardless of toggle direction', () => {
    expect(shouldLoadChildren(node())).toBe(true)
  })

  it('loads unloaded hubs and folders', () => {
    expect(shouldLoadChildren(node({ _apsType: 'hub' }))).toBe(true)
    expect(shouldLoadChildren(node({ _apsType: 'folder' }))).toBe(true)
  })

  it('does not reload an already-loaded node', () => {
    expect(shouldLoadChildren(node({ _loaded: true }))).toBe(false)
  })

  it('does not start a duplicate fetch while one is in flight', () => {
    expect(shouldLoadChildren(node({ _loading: true }))).toBe(false)
  })

  it('never loads leaf or placeholder node types', () => {
    expect(shouldLoadChildren(node({ _apsType: 'item' }))).toBe(false)
    expect(shouldLoadChildren(node({ _apsType: 'loading' }))).toBe(false)
  })

  it('allows retry after a failed load (loaded reset, loading cleared)', () => {
    // handleToggle's error path sets _loaded=false and _loading=false
    expect(shouldLoadChildren(node({ _loaded: false, _loading: false }))).toBe(true)
  })
})
