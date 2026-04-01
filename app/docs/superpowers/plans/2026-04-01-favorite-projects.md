# Favorite Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users star projects for quick sidebar access with drag-and-drop reordering, backed by localStorage via Pinia.

**Architecture:** Pinia store with `pinia-plugin-persistedstate` manages favorites state and localStorage sync. The sidebar renders favorites as a `UNavigationMenu` section. The project tree shows a star toggle on each project node. Clicking a sidebar favorite programmatically expands the tree to that project using `UTree`'s `v-model:expanded`.

**Tech Stack:** Nuxt 4, Pinia + pinia-plugin-persistedstate, @pinia/nuxt, Nuxt UI (UTree, UNavigationMenu, UButton, UIcon), HTML5 Drag and Drop, Vitest

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/stores/favorites.ts` | Pinia store: state, getters, actions, persistence config |
| Create | `app/stores/__tests__/favorites.test.ts` | Unit tests for the favorites store |
| Modify | `app/layouts/default.vue` | Add favorites section to sidebar |
| Modify | `app/components/ApsProjectTree.vue` | Add star toggle button to project nodes |
| Modify | `app/composables/useApsProjects.ts` | Add `navigateToProject()`, expose `expandedKeys` ref |
| Modify | `app/pages/dashboard.vue` | Wire sidebar favorite clicks to tree navigation |
| Modify | `nuxt.config.ts` | Add `@pinia/nuxt` module |
| Modify | `package.json` | Add pinia, @pinia/nuxt, pinia-plugin-persistedstate |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Install pinia packages**

Run from the worktree root (`worktrees/favorite-projects/app`):

```bash
pnpm add pinia @pinia/nuxt pinia-plugin-persistedstate
```

- [ ] **Step 2: Add @pinia/nuxt to nuxt.config.ts modules**

In `nuxt.config.ts`, add `'@pinia/nuxt'` to the `modules` array:

```ts
modules: [
  '@nuxt/eslint',
  '@nuxt/ui',
  '@vueuse/nuxt',
  '@pinia/nuxt'
],
```

- [ ] **Step 3: Create Pinia plugin for persistence**

Create `app/plugins/pinia-persistence.ts`:

```ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin(({ $pinia }) => {
  ($pinia as any).use(piniaPluginPersistedstate)
})
```

- [ ] **Step 4: Verify the app still starts**

```bash
pnpm dev
```

Expected: App starts without errors. Stop the dev server after verifying.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml nuxt.config.ts app/plugins/pinia-persistence.ts
git commit -m "feat(favorites): add pinia and persistence dependencies"
```

---

### Task 2: Favorites Store — Tests

**Files:**
- Create: `app/stores/__tests__/favorites.test.ts`
- Create: `app/stores/favorites.ts` (minimal stub for test discovery)

- [ ] **Step 1: Create store stub**

Create `app/stores/favorites.ts` with just enough for imports:

```ts
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
```

- [ ] **Step 2: Write the failing tests**

Create `app/stores/__tests__/favorites.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm vitest run app/stores/__tests__/favorites.test.ts
```

Expected: Multiple failures — `addFavorite`, `removeFavorite`, `toggleFavorite`, `reorder`, `isFavorite` are not defined on the stub store.

- [ ] **Step 4: Commit**

```bash
git add app/stores/favorites.ts app/stores/__tests__/favorites.test.ts
git commit -m "test(favorites): add failing unit tests for favorites store"
```

---

### Task 3: Favorites Store — Implementation

**Files:**
- Modify: `app/stores/favorites.ts`

- [ ] **Step 1: Implement the full store**

Replace the contents of `app/stores/favorites.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm vitest run app/stores/__tests__/favorites.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add app/stores/favorites.ts
git commit -m "feat(favorites): implement favorites pinia store with persistence"
```

---

### Task 4: Star Button in Project Tree

**Files:**
- Modify: `app/components/ApsProjectTree.vue:311-328` (the `#project-trailing` slot)

- [ ] **Step 1: Import the favorites store**

In `app/components/ApsProjectTree.vue`, add after line 21 (`const runtimeConfig = useRuntimeConfig()`):

```ts
const favoritesStore = useFavoritesStore()
```

And add the import at the top of the `<script setup>` block, after the existing imports:

```ts
import { useFavoritesStore } from '~/stores/favorites'
```

- [ ] **Step 2: Add star button to the project-trailing slot**

Replace the existing `#project-trailing` template slot (lines 311-328) with:

```vue
<template #project-trailing="{ item }">
  <div class="flex items-center gap-1" @click.stop>
    <UButton
      size="xs"
      variant="ghost"
      :color="favoritesStore.isFavorite((item as ApsTreeItem)._projectId || '') ? 'warning' : 'neutral'"
      :icon="favoritesStore.isFavorite((item as ApsTreeItem)._projectId || '') ? 'i-lucide-star' : 'i-lucide-star'"
      :class="favoritesStore.isFavorite((item as ApsTreeItem)._projectId || '') ? 'opacity-100' : 'opacity-40 hover:opacity-100'"
      @click="favoritesStore.toggleFavorite({
        projectId: (item as ApsTreeItem)._projectId || '',
        hubId: (item as ApsTreeItem)._hubId || '',
        region: (item as ApsTreeItem)._region,
        label: (item as ApsTreeItem).label || ''
      })"
    />
    <UButton
      v-if="searchingProject !== (item as ApsTreeItem)._projectId"
      size="xs"
      variant="ghost"
      color="neutral"
      icon="i-lucide-file-search"
      @click="onSearchRevitFiles(item as ApsTreeItem)"
    >
      Find .rvt
    </UButton>
    <div v-else class="flex items-center gap-1 text-xs text-muted">
      <UIcon name="i-lucide-loader" class="animate-spin" size="14" />
      <span>Scanning...</span>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verify visually**

```bash
pnpm dev
```

Navigate to the dashboard, expand a hub to see projects. Each project should show a star icon next to the "Find .rvt" button. Clicking the star should toggle between muted (unfavorited) and yellow/warning (favorited). Refreshing the page should persist the state.

- [ ] **Step 4: Commit**

```bash
git add app/components/ApsProjectTree.vue
git commit -m "feat(favorites): add star toggle button to project tree nodes"
```

---

### Task 5: Sidebar Favorites Section

**Files:**
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Import the favorites store and add drag state**

In `app/layouts/default.vue`, add to the `<script setup>` block:

```ts
import { useFavoritesStore } from '~/stores/favorites'

const favoritesStore = useFavoritesStore()
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(toIndex: number) {
  if (dragIndex.value !== null && dragIndex.value !== toIndex) {
    favoritesStore.reorder(dragIndex.value, toIndex)
  }
  dragIndex.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}
```

- [ ] **Step 2: Add shared navigation state**

Since `default.vue` is a layout (not a child component), we use Nuxt's `useState` to share navigation intent with the dashboard page. Add to the `<script setup>` block:

```ts
const pendingNavigation = useState<{ projectId: string, hubId: string, region?: string } | null>('pending-favorite-nav', () => null)
```

- [ ] **Step 3: Add favorites section to the sidebar template**

In the `<template>` section, replace the entire `#default` slot of `UDashboardSidebar` with:

```vue
<template #default="{ collapsed }">
  <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

  <!-- Favorites -->
  <div v-if="favoritesStore.sortedFavorites.length > 0" class="flex flex-col gap-0.5 px-2.5">
    <span v-if="!collapsed" class="px-2 py-1 text-xs font-medium text-muted uppercase tracking-wider">
      Favorites
    </span>
    <div
      v-for="(fav, index) in favoritesStore.sortedFavorites"
      :key="fav.projectId"
      draggable="true"
      class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors hover:bg-elevated"
      :class="{
        'bg-elevated/50': dragOverIndex === index && dragIndex !== index,
        'opacity-50': dragIndex === index
      }"
      @dragstart="onDragStart(index, $event)"
      @dragover="onDragOver(index, $event)"
      @dragleave="onDragLeave"
      @drop="onDrop(index)"
      @dragend="onDragEnd"
      @click="pendingNavigation = { projectId: fav.projectId, hubId: fav.hubId, region: fav.region }"
    >
      <UIcon name="i-lucide-folder-kanban" class="shrink-0 text-muted" />
      <span v-if="!collapsed" class="truncate">{{ fav.label }}</span>
      <UTooltip v-if="collapsed" :text="fav.label" side="right">
        <span />
      </UTooltip>
    </div>
  </div>

  <UNavigationMenu
    :collapsed="collapsed"
    :items="links[0]"
    orientation="vertical"
    tooltip
    popover
  />
</template>
```

- [ ] **Step 4: Verify visually**

```bash
pnpm dev
```

Star some projects in the tree (requires Task 4 to be complete). Favorited projects should appear in the sidebar between search and Home. Drag and drop should reorder them. Collapsed sidebar should show just icons with tooltips.

- [ ] **Step 5: Commit**

```bash
git add app/layouts/default.vue
git commit -m "feat(favorites): add favorites section to sidebar with drag-and-drop"
```

---

### Task 6: Tree Navigation — Expanded Keys

**Files:**
- Modify: `app/composables/useApsProjects.ts`
- Modify: `app/components/ApsProjectTree.vue`

- [ ] **Step 1: Add expandedKeys ref and navigateToProject to the composable**

In `app/composables/useApsProjects.ts`, add a new ref after `scannedFolders` (line 40):

```ts
const expandedKeys = ref<string[]>([])
```

Add the `navigateToProject` function before the `return` statement:

```ts
async function navigateToProject(hubId: string, projectId: string, region?: string) {
  // Find the hub node
  const hubKey = `hub-${hubId}`
  const hubNode = items.value.find(i => i._apsId === hubKey)
  if (!hubNode) return

  // Load projects if not yet loaded
  if (!hubNode._loaded) {
    await loadProjects(hubNode)
  }

  // Find the project node
  const projectKey = `project-${projectId}`
  const projectNode = hubNode.children?.find(c => c._apsId === projectKey)
  if (!projectNode) return

  // Expand hub and project
  const newKeys = new Set(expandedKeys.value)
  newKeys.add(hubKey)
  newKeys.add(projectKey)
  expandedKeys.value = [...newKeys]
}
```

Add `expandedKeys` and `navigateToProject` to the return object:

```ts
return {
  items,
  loading,
  warnings,
  searchingProject,
  searchProgress,
  searchResults,
  scannedFolders,
  expandedKeys,
  loadHubs,
  handleToggle,
  searchRevitFiles,
  addManualHub,
  addExternalProject,
  navigateToProject
}
```

- [ ] **Step 2: Bind expandedKeys to UTree in ApsProjectTree**

In `app/components/ApsProjectTree.vue`, destructure `expandedKeys` and `navigateToProject` from `useApsProjects()` (around line 7):

```ts
const {
  items,
  loading,
  warnings,
  searchingProject,
  searchProgress,
  searchResults,
  expandedKeys,
  loadHubs,
  handleToggle,
  searchRevitFiles,
  addManualHub,
  addExternalProject,
  navigateToProject
} = useApsProjects()
```

Then bind `v-model:expanded` on the `<UTree>` component (around line 298):

```vue
<UTree
  v-if="!loading"
  v-model:expanded="expandedKeys"
  :items="filteredItems"
  :get-key="(item: TreeItem) => (item as ApsTreeItem)._apsId"
  expanded-icon="i-lucide-folder-open"
  collapsed-icon="i-lucide-folder"
  color="neutral"
  @toggle="onToggle"
  @select="onSelect"
>
```

- [ ] **Step 3: Expose navigateToProject for external use**

Since `useApsProjects()` uses module-scope refs (singleton pattern), the `navigateToProject` function is already accessible from anywhere that calls `useApsProjects()`. The `pendingNavigation` state from Task 5 will be watched in the dashboard page (Task 7).

- [ ] **Step 4: Verify expanded state still works**

```bash
pnpm dev
```

Navigate to the dashboard. Expanding/collapsing tree nodes should still work correctly. The `v-model:expanded` binding should sync with user interactions.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useApsProjects.ts app/components/ApsProjectTree.vue
git commit -m "feat(favorites): add expandedKeys and navigateToProject to tree composable"
```

---

### Task 7: Wire Sidebar Navigation to Tree

**Files:**
- Modify: `app/pages/dashboard.vue`

- [ ] **Step 1: Watch pendingNavigation and call navigateToProject**

In `app/pages/dashboard.vue`, add to the `<script setup>` block:

```ts
const { navigateToProject } = useApsProjects()

const pendingNavigation = useState<{ projectId: string, hubId: string, region?: string } | null>('pending-favorite-nav', () => null)

watch(pendingNavigation, async (nav) => {
  if (!nav) return
  await navigateToProject(nav.hubId, nav.projectId, nav.region)
  pendingNavigation.value = null
})
```

- [ ] **Step 2: Verify end-to-end**

```bash
pnpm dev
```

1. Expand a hub, star a project
2. The project appears in the sidebar
3. Collapse the hub in the tree
4. Click the favorite in the sidebar
5. The hub and project should expand in the tree

- [ ] **Step 3: Commit**

```bash
git add app/pages/dashboard.vue
git commit -m "feat(favorites): wire sidebar favorites to tree navigation"
```

---

### Task 8: Run Full Test Suite and Lint

- [ ] **Step 1: Run all tests**

```bash
pnpm vitest run
```

Expected: All tests pass, including the new favorites store tests.

- [ ] **Step 2: Run linter**

```bash
pnpm lint
```

Expected: No lint errors. Fix any issues found.

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors. Fix any issues found.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(favorites): fix lint and type errors"
```

(Skip this step if no fixes were needed.)
