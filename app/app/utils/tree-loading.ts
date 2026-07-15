import type { ApsTreeItem } from '~/types/aps'

const EXPANDABLE_TYPES = new Set(['hub', 'project', 'folder'])

/**
 * Whether a toggled tree node needs its children fetched. Direction of the
 * toggle is deliberately ignored — reka-ui's toggle event reports expansion
 * state with different semantics for controlled vs uncontrolled trees, which
 * made first-expand loading hang. Loading is keyed purely off node state:
 * not yet loaded, not currently loading, and of an expandable type.
 */
export function shouldLoadChildren(node: ApsTreeItem): boolean {
  if (node._loaded || node._loading) return false
  return EXPANDABLE_TYPES.has(node._apsType)
}
