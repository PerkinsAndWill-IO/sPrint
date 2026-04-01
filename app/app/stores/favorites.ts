import { defineStore } from 'pinia'

export interface FavoriteProject {
  projectId: string
  hubId: string
  region?: string
  label: string
  order: number
}

export const useFavoritesStore = defineStore('favorites', {
  state: (): { favorites: FavoriteProject[] } => ({
    favorites: []
  }),

  getters: {
    sortedFavorites: (state) => {
      return [...state.favorites].sort((a, b) => a.order - b.order)
    }
  },

  actions: {
    addFavorite(project: Omit<FavoriteProject, 'order'>) {
      const maxOrder = this.favorites.reduce((max, f) => Math.max(max, f.order), -1)
      this.favorites.push({ ...project, order: maxOrder + 1 })
    },

    removeFavorite(projectId: string) {
      this.favorites = this.favorites.filter(f => f.projectId !== projectId)
      // Re-normalize order values
      this.favorites
        .sort((a, b) => a.order - b.order)
        .forEach((f, i) => { f.order = i })
    },

    isFavorite(projectId: string): boolean {
      return this.favorites.some(f => f.projectId === projectId)
    },

    toggleFavorite(project: Omit<FavoriteProject, 'order'>) {
      if (this.isFavorite(project.projectId)) {
        this.removeFavorite(project.projectId)
      } else {
        this.addFavorite(project)
      }
    },

    reorder(fromIndex: number, toIndex: number) {
      const sorted = this.sortedFavorites
      const [moved] = sorted.splice(fromIndex, 1)
      sorted.splice(toIndex, 0, moved!)
      sorted.forEach((f, i) => { f.order = i })
      this.favorites = sorted
    }
  },

  persist: {
    key: 'sprint-favorites'
  }
})
