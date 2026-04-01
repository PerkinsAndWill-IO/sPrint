import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFavoritesStore } from '../favorites'

describe('useFavoritesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('addFavorite', () => {
    it('adds a project with the next order value', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })

      expect(store.favorites).toHaveLength(1)
      expect(store.favorites[0]).toEqual({
        projectId: 'p1',
        hubId: 'h1',
        label: 'Project 1',
        order: 0
      })
    })

    it('assigns incremental order values', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })
      store.addFavorite({ projectId: 'p2', hubId: 'h1', label: 'Project 2' })

      expect(store.favorites[0]!.order).toBe(0)
      expect(store.favorites[1]!.order).toBe(1)
    })

    it('stores region when provided', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'EU Project', region: 'EMEA' })

      expect(store.favorites[0]!.region).toBe('EMEA')
    })
  })

  describe('removeFavorite', () => {
    it('removes a project by projectId', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })
      store.addFavorite({ projectId: 'p2', hubId: 'h1', label: 'Project 2' })

      store.removeFavorite('p1')

      expect(store.favorites).toHaveLength(1)
      expect(store.favorites[0]!.projectId).toBe('p2')
    })

    it('re-normalizes order values after removal', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })
      store.addFavorite({ projectId: 'p2', hubId: 'h1', label: 'Project 2' })
      store.addFavorite({ projectId: 'p3', hubId: 'h1', label: 'Project 3' })

      store.removeFavorite('p2')

      expect(store.favorites.map(f => f.order)).toEqual([0, 1])
    })
  })

  describe('isFavorite', () => {
    it('returns true for a favorited project', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })

      expect(store.isFavorite('p1')).toBe(true)
    })

    it('returns false for a non-favorited project', () => {
      const store = useFavoritesStore()

      expect(store.isFavorite('p1')).toBe(false)
    })
  })

  describe('toggleFavorite', () => {
    it('adds a project if not favorited', () => {
      const store = useFavoritesStore()
      store.toggleFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })

      expect(store.favorites).toHaveLength(1)
    })

    it('removes a project if already favorited', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })
      store.toggleFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })

      expect(store.favorites).toHaveLength(0)
    })
  })

  describe('reorder', () => {
    it('moves an item from one position to another', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })
      store.addFavorite({ projectId: 'p2', hubId: 'h1', label: 'Project 2' })
      store.addFavorite({ projectId: 'p3', hubId: 'h1', label: 'Project 3' })

      store.reorder(0, 2)

      const ids = store.sortedFavorites.map(f => f.projectId)
      expect(ids).toEqual(['p2', 'p3', 'p1'])
    })

    it('updates order values for all affected items', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })
      store.addFavorite({ projectId: 'p2', hubId: 'h1', label: 'Project 2' })
      store.addFavorite({ projectId: 'p3', hubId: 'h1', label: 'Project 3' })

      store.reorder(2, 0)

      const orders = store.sortedFavorites.map(f => f.order)
      expect(orders).toEqual([0, 1, 2])
    })
  })

  describe('sortedFavorites', () => {
    it('returns favorites sorted by order', () => {
      const store = useFavoritesStore()
      store.addFavorite({ projectId: 'p1', hubId: 'h1', label: 'Project 1' })
      store.addFavorite({ projectId: 'p2', hubId: 'h1', label: 'Project 2' })
      store.addFavorite({ projectId: 'p3', hubId: 'h1', label: 'Project 3' })

      // Manually scramble orders to verify sorting
      store.favorites[0]!.order = 2
      store.favorites[2]!.order = 0

      const ids = store.sortedFavorites.map(f => f.projectId)
      expect(ids).toEqual(['p3', 'p2', 'p1'])
    })
  })
})
