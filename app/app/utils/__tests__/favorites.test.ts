import { describe, it, expect } from 'vitest'
import { isFavorited, toggleFavoriteInList } from '~/utils/favorites'
import type { FavoriteProject } from '~/utils/favorites'

const fav: FavoriteProject = { projectId: 'b.proj-1', hubId: 'b.hub-1', label: 'Downtown Campus' }

describe('toggleFavoriteInList', () => {
  it('adds when absent', () => {
    expect(toggleFavoriteInList([], fav)).toEqual([fav])
  })

  it('removes when present', () => {
    expect(toggleFavoriteInList([fav], fav)).toEqual([])
  })

  it('distinguishes external projects by folderId', () => {
    const external = { ...fav, folderId: 'urn.folder.1' }
    const list = toggleFavoriteInList([fav], external)
    expect(list).toHaveLength(2)
    expect(isFavorited(list, fav)).toBe(true)
    expect(isFavorited(list, external)).toBe(true)
  })
})

describe('isFavorited', () => {
  it('matches on projectId when no folderId', () => {
    expect(isFavorited([fav], { projectId: 'b.proj-1' })).toBe(true)
    expect(isFavorited([fav], { projectId: 'b.proj-2' })).toBe(false)
  })
})
