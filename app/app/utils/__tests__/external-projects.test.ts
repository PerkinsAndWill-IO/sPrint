import { describe, it, expect } from 'vitest'
import {
  externalProjectApsId,
  upsertStoredExternalProject,
  removeStoredExternalProject,
  buildStoredExternalProjectNode
} from '~/utils/external-projects'
import type { StoredExternalProject } from '~/utils/external-projects'

const project: StoredExternalProject = {
  projectId: 'b.proj-1',
  folderId: 'urn.folder.1',
  name: 'Downtown Campus'
}

describe('upsertStoredExternalProject', () => {
  it('adds a new project', () => {
    expect(upsertStoredExternalProject([], project)).toEqual([project])
  })

  it('dedupes on projectId + folderId, keeping the latest entry', () => {
    const updated = { ...project, name: 'Renamed' }
    const result = upsertStoredExternalProject([project], updated)
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('Renamed')
  })

  it('keeps entries with a different folderId in the same project', () => {
    const other = { ...project, folderId: 'urn.folder.2' }
    expect(upsertStoredExternalProject([project], other)).toHaveLength(2)
  })
})

describe('removeStoredExternalProject', () => {
  it('removes by tree node aps id', () => {
    const result = removeStoredExternalProject([project], externalProjectApsId(project))
    expect(result).toEqual([])
  })

  it('leaves other entries untouched', () => {
    const other = { ...project, folderId: 'urn.folder.2' }
    const result = removeStoredExternalProject([project, other], externalProjectApsId(project))
    expect(result).toEqual([other])
  })
})

describe('buildStoredExternalProjectNode', () => {
  it('builds a lazy project node with a loading placeholder', () => {
    const node = buildStoredExternalProjectNode(project)
    expect(node._apsId).toBe('project-b.proj-1-urn.folder.1')
    expect(node._apsType).toBe('project')
    expect(node._projectId).toBe('b.proj-1')
    expect(node._folderId).toBe('urn.folder.1')
    expect(node._projectName).toBe('Downtown Campus')
    expect(node._loaded).toBe(false)
    expect(node.children).toHaveLength(1)
    expect(node.children![0]!._apsType).toBe('loading')
  })
})
