import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {} from 'pinia-plugin-persistedstate'

export interface FavoriteProject {
  projectId: string
  hubId: string
  region?: string
  label: string
  order: number
}

export const useFavoritesStore = defineStore('favorites', () => {
  const favorites = ref<FavoriteProject[]>([])

  const sortedFavorites = computed(() =>
    [...favorites.value].sort((a, b) => a.order - b.order)
  )

  function addFavorite(project: Omit<FavoriteProject, 'order'>) {
    const maxOrder = favorites.value.reduce((max, f) => Math.max(max, f.order), -1)
    favorites.value.push({ ...project, order: maxOrder + 1 })
  }

  function removeFavorite(projectId: string) {
    favorites.value = favorites.value.filter(f => f.projectId !== projectId)
    // Re-normalize order values
    favorites.value
      .sort((a, b) => a.order - b.order)
      .forEach((f, i) => {
        f.order = i
      })
  }

  function isFavorite(projectId: string): boolean {
    return favorites.value.some(f => f.projectId === projectId)
  }

  function toggleFavorite(project: Omit<FavoriteProject, 'order'>) {
    if (isFavorite(project.projectId)) {
      removeFavorite(project.projectId)
    } else {
      addFavorite(project)
    }
  }

  function reorder(fromIndex: number, toIndex: number) {
    const sorted = [...sortedFavorites.value]
    const [moved] = sorted.splice(fromIndex, 1)
    sorted.splice(toIndex, 0, moved!)
    sorted.forEach((f, i) => {
      f.order = i
    })
    favorites.value = sorted
  }

  return {
    favorites,
    sortedFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    reorder
  }
}, {
  persist: {
    key: 'sprint-favorites'
  }
})
