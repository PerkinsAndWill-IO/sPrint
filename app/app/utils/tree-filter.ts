import type { ApsTreeItem } from '~/types/aps'

function isUnloadedHub(node: ApsTreeItem): boolean {
  return !node.children?.length || node.children.every(c => c._apsType === 'loading')
}

/**
 * Filters the project tree by hub/project names only. Nested folders and
 * files never match, and matched projects keep their original children so
 * expanding a match shows the normal folder tree.
 */
export function filterProjectTree(nodes: ApsTreeItem[], query: string): ApsTreeItem[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  return nodes.reduce<ApsTreeItem[]>((acc, node) => {
    if (node._apsType === 'hub') {
      if (node.label?.toLowerCase().includes(q) || isUnloadedHub(node)) {
        acc.push(node)
        return acc
      }
      const matchedProjects = (node.children ?? []).filter(
        c => c._apsType === 'project' && c.label?.toLowerCase().includes(q)
      )
      if (matchedProjects.length > 0) {
        acc.push({ ...node, children: matchedProjects })
      }
    } else if (node._apsType === 'project' && node.label?.toLowerCase().includes(q)) {
      acc.push(node)
    }
    return acc
  }, [])
}
