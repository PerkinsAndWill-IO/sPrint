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
  })
})
