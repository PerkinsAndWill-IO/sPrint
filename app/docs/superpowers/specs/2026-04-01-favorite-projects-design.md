# Favorite Projects

Save projects as favorites for quick access from the sidebar.

## Overview

Users can star any project in the APS project tree. Starred projects appear in a dedicated "Favorites" section in the sidebar, providing one-click navigation back to that project. Favorites are drag-and-drop reorderable.

Storage starts with localStorage via Pinia's persistence plugin, designed for easy migration to a cloud-backed API.

## Data Model

```ts
interface FavoriteProject {
  projectId: string    // APS project ID
  hubId: string        // parent hub ID
  region?: string      // hub region (US/EU/CA)
  label: string        // display name
  order: number        // for drag-and-drop sorting
}
```

Persisted as a JSON array in localStorage via `pinia-plugin-persistedstate`.

## Pinia Store (`useFavoritesStore`)

**File:** `app/stores/favorites.ts`

**State:**
- `favorites: FavoriteProject[]` — the list of favorited projects

**Getters:**
- `sortedFavorites` — returns favorites sorted by `order`

**Actions:**
- `addFavorite(project: Omit<FavoriteProject, 'order'>)` — adds a project to favorites with the next order value
- `removeFavorite(projectId: string)` — removes a project and re-normalizes order values
- `isFavorite(projectId: string): boolean` — checks if a project is favorited
- `toggleFavorite(project: Omit<FavoriteProject, 'order'>)` — toggles add/remove
- `reorder(fromIndex: number, toIndex: number)` — moves a favorite from one position to another, updating order values for all affected items

**Persistence:**
- Uses `pinia-plugin-persistedstate` with key `sprint-favorites`
- Cloud migration path: replace the `persist` option's `storage` property with a custom adapter that calls a server API. No other code changes required.

## Sidebar Favorites Section

**File:** `app/layouts/default.vue`

**Placement:** Between the search button and the "Home" navigation link.

**Behavior:**
- Renders a "Favorites" label and a list of favorited projects using `UNavigationMenu` items
- Each item displays the project name with a `i-lucide-folder-kanban` icon (matching tree style)
- Clicking a favorite navigates the tree to that project (see Tree Navigation below)
- Hidden entirely when no favorites exist
- When sidebar is collapsed, favorites show as icon-only with tooltips (consistent with existing collapsed behavior)

**Drag-and-Drop Reordering:**
- Each favorite item has `draggable="true"`
- HTML5 drag events (`@dragstart`, `@dragover`, `@drop`) handle reordering
- On drop, calls `favoritesStore.reorder(fromIndex, toIndex)`
- Visual feedback during drag (highlight drop target)

## Star Button in Project Tree

**File:** `app/components/ApsProjectTree.vue` (existing `project` slot)

**Behavior:**
- A star icon is always visible next to each project name
- Filled star (`i-lucide-star` with highlight color) for favorited projects
- Outline star (`i-lucide-star` with muted color) for non-favorited projects
- Clicking the star calls `favoritesStore.toggleFavorite()` with the project's data (`projectId`, `hubId`, `region`, `label`)
- Click event stops propagation so it doesn't toggle the tree node

## Tree Navigation on Favorite Click

**File:** `app/composables/useApsProjects.ts`

**New function:** `navigateToProject(hubId: string, projectId: string, region?: string)`

**Behavior:**
1. Find the hub node in the tree by `_hubId`
2. If the hub's projects haven't been loaded, trigger `loadProjects()` and wait
3. Find the project node within the hub's children by `_projectId`
4. Expand both the hub and project nodes in the tree
5. The dashboard page wires this up: clicking a sidebar favorite calls `navigateToProject()` which updates the tree state

**Expanded state management:** `UTree` supports `v-model:expanded` with a `string[]` of expanded node keys. `ApsProjectTree` will bind this to a ref (`expandedKeys`) and expose it. The `navigateToProject` function pushes the hub and project keys into this array to programmatically expand the tree path. The tree's existing `@toggle` handler will keep this ref in sync when users manually expand/collapse nodes.

## Dependencies

**New:**
- `pinia` — state management
- `pinia-plugin-persistedstate` — automatic localStorage persistence
- `@pinia/nuxt` — Nuxt module for Pinia

**No other new dependencies.** Drag-and-drop uses native HTML5 APIs.

## Testing

**Unit tests for the Pinia store** (`app/stores/__tests__/favorites.test.ts`):
- Add a favorite, verify it's in the list
- Remove a favorite, verify it's gone
- Toggle on/off
- Reorder: move item from position 0 to position 2, verify order values
- `isFavorite` returns correct boolean

**Component test for star button** (`app/components/__tests__/FavoriteStarButton.test.ts`):
- Renders outline star for non-favorited project
- Renders filled star for favorited project
- Clicking toggles the favorite state

## Cloud Migration Path

When ready to move favorites to the cloud:

1. Create a server API endpoint (`/api/favorites`) with GET, POST, PUT, DELETE
2. Implement a custom Pinia persistence storage adapter that calls the API instead of localStorage
3. Swap the `storage` option in the store's `persist` config
4. No UI code changes needed
