export interface FavoriteProject {
  projectId: string
  hubId?: string
  folderId?: string
  label: string
  region?: string
}

export function favoriteKey(f: Pick<FavoriteProject, 'projectId' | 'folderId'>): string {
  return f.folderId ? `${f.projectId}:${f.folderId}` : f.projectId
}

export function isFavorited(list: FavoriteProject[], f: Pick<FavoriteProject, 'projectId' | 'folderId'>): boolean {
  return list.some(p => favoriteKey(p) === favoriteKey(f))
}

export function toggleFavoriteInList(list: FavoriteProject[], f: FavoriteProject): FavoriteProject[] {
  if (isFavorited(list, f)) {
    return list.filter(p => favoriteKey(p) !== favoriteKey(f))
  }
  return [...list, f]
}
