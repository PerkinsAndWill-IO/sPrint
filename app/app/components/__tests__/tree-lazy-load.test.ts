// Regression test for the "first expand hangs on Loading..." bug.
//
// UTree renders nested branches by reading `item.children` on plain node
// objects; a branch only re-renders when that in-place mutation is reactive.
// The tree ref MUST therefore be a deep ref — with a shallowRef, children
// committed by findAndReplaceChildren never appear until the branch is
// collapsed and re-expanded. These tests pin the mechanism.
import { describe, it, expect } from 'vitest'
import { ref, shallowRef, computed } from 'vue'
import type { Ref } from 'vue'
import { findAndReplaceChildren } from '~/composables/useApsProjects'
import type { ApsTreeItem } from '~/types/aps'

function makeTree(): ApsTreeItem[] {
  return [{
    label: 'Alpha Project',
    _apsType: 'project',
    _apsId: 'project-alpha',
    _projectId: 'alpha',
    children: [{
      label: 'Loading...',
      disabled: true,
      _apsType: 'loading',
      _apsId: 'loading-project-alpha'
    }]
  }]
}

const loadedChildren: ApsTreeItem[] = [
  { label: 'Project Files', _apsType: 'folder', _apsId: 'folder-1' }
]

// Simulates what UTree's nested branch template reads during render
function renderBranch(items: ApsTreeItem[]): string[] {
  return items[0]!.children?.map(c => c.label || '') ?? []
}

describe('lazy-loaded tree children reactivity (first expand)', () => {
  it('committed children are visible through a deep ref without reassigning items.value', () => {
    const items = ref<ApsTreeItem[]>(makeTree()) as Ref<ApsTreeItem[]>
    const branch = computed(() => renderBranch(items.value))

    expect(branch.value).toEqual(['Loading...'])

    findAndReplaceChildren(items.value, 'project-alpha', loadedChildren)

    // No items.value reassignment — the render must react to the nested
    // mutation alone, exactly like UTree's expanded branch does
    expect(branch.value).toEqual(['Project Files'])
  })

  it('documents the shallowRef failure mode this guards against', () => {
    const items = shallowRef<ApsTreeItem[]>(makeTree())
    const branch = computed(() => renderBranch(items.value))

    expect(branch.value).toEqual(['Loading...'])

    findAndReplaceChildren(items.value, 'project-alpha', loadedChildren)

    // Stale: the computed (≈ the rendered branch) never saw the commit.
    // If this assertion ever starts failing, Vue semantics changed and the
    // deep-ref requirement in useApsProjects can be revisited.
    expect(branch.value).toEqual(['Loading...'])
  })

  it('findAndReplaceChildren marks the parent loaded and replaces nested targets', () => {
    const items = makeTree()
    const found = findAndReplaceChildren(items, 'project-alpha', loadedChildren)

    expect(found).toBe(true)
    expect(items[0]!._loaded).toBe(true)
    expect(items[0]!.children).toBe(loadedChildren)
    expect(findAndReplaceChildren(items, 'missing-id', [])).toBe(false)
  })
})
