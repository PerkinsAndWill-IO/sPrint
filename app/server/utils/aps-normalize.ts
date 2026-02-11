import type { ApsHub, ApsFolderContent } from '~/types/aps'

interface ApsHubRaw {
  id: string
  attributes: { name: string; region: string }
}

interface ApsFolderItemRaw {
  id: string
  type: string
  attributes: { displayName?: string; name?: string }
}

export function normalizeHubs(data: ApsHubRaw[]): ApsHub[] {
  return data.map(hub => ({
    id: hub.id,
    name: hub.attributes.name,
    region: hub.attributes.region
  }))
}

export function normalizeWarnings(warnings: Array<{ Detail?: string; Title?: string }> | undefined): string[] {
  return (warnings || []).map(w => w.Detail || w.Title || 'Unknown warning')
}

export function normalizeFolderContents(data: ApsFolderItemRaw[]): ApsFolderContent[] {
  return data.map((item) => {
    const name = item.attributes.displayName || item.attributes.name || 'Unnamed'
    return {
      id: item.id,
      name,
      type: item.type === 'folders' ? 'folders' as const : 'items' as const,
      isRevitFile: name.toLowerCase().endsWith('.rvt')
    }
  })
}
