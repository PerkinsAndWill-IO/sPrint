<script setup lang="ts">
import type { TreeItemToggleEvent } from 'reka-ui'
import type { TreeItem } from '@nuxt/ui'
import type { ApsTreeItem } from '~/types/aps'
import type { FavoriteProject } from '~/utils/favorites'

const {
  items,
  expandedKeys,
  loading,
  warnings,
  searchingProject,
  searchProgress,
  searchResults,
  loadHubs,
  handleToggle,
  expandNode,
  searchRevitFiles,
  clearSearchResults,
  addManualHub,
  addExternalProject,
  rehydrateStored,
  removeExternalProject,
  favoriteProjects,
  toggleFavorite,
  isFavorite,
  openFavorite
} = useApsProjects()

const { isFileSelected, toggleFile, removeFile } = useDerivatives()
const runtimeConfig = useRuntimeConfig()

const selectedProject = shallowRef<ApsTreeItem | null>(null)
const error = ref<string | null>(null)
const manualHubId = ref('')
const showManualInput = ref(false)
const externalUrl = ref('')
const externalError = ref<string | null>(null)
const externalPopoverOpen = ref(false)
const externalLoading = ref(false)
const treeFilter = ref('')
const resultsDrawerOpen = ref(false)
const resultsFilter = ref('')

const filteredResults = computed(() => {
  if (!resultsFilter.value) return searchResults.value
  const q = resultsFilter.value.toLowerCase()
  return searchResults.value.filter(f =>
    f.name.toLowerCase().includes(q) || f.path?.toLowerCase().includes(q)
  )
})

// Auto-open drawer when search finishes with results
watch(searchingProject, (newVal, oldVal) => {
  if (oldVal && !newVal && searchResults.value.length > 0) {
    resultsDrawerOpen.value = true
  }
})

const filteredItems = computed<ApsTreeItem[]>(() => filterProjectTree(items.value as ApsTreeItem[], treeFilter.value))

function selectAllResults() {
  const project = selectedProject.value
  if (!project?._projectId) return
  for (const file of searchResults.value) {
    if (!isFileSelected(file.id)) {
      toggleFile(file.id, project._projectId, file.name, project._region, project._projectName ?? project.label)
    }
  }
}

function deselectAllResults() {
  for (const file of searchResults.value) {
    if (isFileSelected(file.id)) removeFile(file.id)
  }
}

function onCloseSearchResults() {
  resultsDrawerOpen.value = false
  resultsFilter.value = ''
  clearSearchResults()
}

function onAddManualHub() {
  if (!manualHubId.value.trim()) return
  error.value = null
  showManualInput.value = false
  addManualHub(manualHubId.value.trim())
}

async function onAddExternalProject() {
  if (!externalUrl.value.trim()) return
  externalError.value = null
  externalLoading.value = true
  try {
    await addExternalProject(externalUrl.value.trim())
    externalUrl.value = ''
    externalPopoverOpen.value = false
  } catch (e: unknown) {
    externalError.value = e instanceof Error ? e.message : 'Failed to load external project'
  } finally {
    externalLoading.value = false
  }
}

onMounted(async () => {
  try {
    await loadHubs()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load hubs'
  } finally {
    // Restore saved manual hubs / external projects after loadHubs
    // replaced the tree (and even if it failed)
    rehydrateStored()
  }
})

function onToggle(_e: TreeItemToggleEvent<TreeItem>, item: TreeItem) {
  handleToggle(item as ApsTreeItem)
}

function isRvtItem(item: ApsTreeItem): boolean {
  return item._apsType === 'item' && !!item.label?.toLowerCase().endsWith('.rvt')
}

function getItemId(item: ApsTreeItem): string {
  return item._apsId.replace('item-', '')
}

function getAccUrl(item: ApsTreeItem): string {
  return buildAccProjectUrl(item._projectId || '', item._region, getItemId(item))
}

function onSelect(_e: unknown, item: TreeItem) {
  const apsItem = item as ApsTreeItem
  if (isRvtItem(apsItem)) {
    const itemId = getItemId(apsItem)
    const projectId = apsItem._projectId
    if (!projectId) return
    toggleFile(itemId, projectId, apsItem.label || '', apsItem._region, apsItem._projectName)
  }
}

function onSearchRevitFiles(project: ApsTreeItem) {
  if (!project._projectId) return
  // External projects use folderId instead of hubId
  if (!project._hubId && !project._folderId) return
  selectedProject.value = project
  searchRevitFiles(project._hubId, project._projectId, project._folderId)
}

const treeContainer = ref<HTMLElement | null>(null)

async function onFavoriteClick(fav: FavoriteProject) {
  // An active filter could hide the target row
  treeFilter.value = ''
  const apsId = await openFavorite(fav)
  if (!apsId) return

  // Wait for the expanded rows to render, then scroll + flash the row
  for (let attempt = 0; attempt < 10; attempt++) {
    await nextTick()
    const marker = treeContainer.value?.querySelector(`[data-aps-id="${CSS.escape(apsId)}"]`)
    const row = marker?.closest('[role="treeitem"]') as HTMLElement | null
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'smooth' })
      row.classList.add('ring-2', 'ring-primary', 'rounded-md', 'transition')
      setTimeout(() => row.classList.remove('ring-2', 'ring-primary', 'rounded-md', 'transition'), 1600)
      return
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

function onSearchResultClick(fileId: string, fileName: string) {
  const project = selectedProject.value
  if (!project?._projectId) return
  const adding = !isFileSelected(fileId)
  toggleFile(fileId, project._projectId, fileName, project._region, project._projectName ?? project.label)
  // Expand the owning project so the tree doesn't look empty
  if (adding) expandNode(project)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Pinned header: title, status, favorites, filter -->
    <div class="flex shrink-0 flex-col gap-4 p-4 pb-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          Projects
        </h2>
        <UPopover v-model:open="externalPopoverOpen">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-globe"
            label="Add from external hub"
          />
          <template #content>
            <div class="flex flex-col gap-2 p-3 w-80">
              <p class="text-xs text-muted">
                Paste a BIM 360 or ACC project URL to add it directly.
              </p>
              <UInput
                v-model="externalUrl"
                icon="i-lucide-link"
                placeholder="https://docs.b360.autodesk.com/..."
                size="sm"
                autofocus
                @keyup.enter="onAddExternalProject"
              />
              <p v-if="externalError" class="text-xs text-red-500">
                {{ externalError }}
              </p>
              <UButton
                size="sm"
                label="Add"
                icon="i-lucide-plus"
                :loading="externalLoading"
                :disabled="!externalUrl.trim()"
                block
                @click="onAddExternalProject"
              />
              <UPopover :content="{ side: 'left', align: 'start', sideOffset: 8 }">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="info"
                  icon="i-lucide-info"
                  label="Can't see your projects?"
                  block
                />
                <template #content>
                  <div class="flex max-h-[80vh] w-[28rem] flex-col gap-3 overflow-y-auto p-4 text-xs">
                    <p class="text-sm font-semibold">
                      Setup Custom Integration
                    </p>
                    <p class="text-muted">
                      An ACC Account Admin must add sPRINT as a Custom Integration:
                    </p>
                    <p class="text-muted">
                      Prerequisites: You must be an ACC Account Admin for the relevant ACC account.
                    </p>
                    <ol class="list-decimal list-inside space-y-2 text-muted">
                      <li>Open <strong>Account Admin</strong> (left navigation)</li>
                      <li>In the Account Admin menu, click <strong>Custom Integrations</strong></li>
                      <li>Click <strong>+ Add custom integration</strong></li>
                    </ol>
                    <img src="/images/setup/acc-custom-integrations.png" alt="ACC Custom Integrations page" class="w-full rounded border border-default">
                    <p class="text-muted">
                      In the "Add custom integration" window:
                    </p>
                    <ul class="list-disc list-inside space-y-2 text-muted">
                      <li>In Autodesk Platform Services Client ID (required), paste: <code class="select-all rounded bg-elevated px-1">{{ runtimeConfig.public.apsClientId }}</code></li>
                      <li>In Custom integration name (required), enter: <strong>sPRINT</strong></li>
                    </ul>
                    <img src="/images/setup/acc-add-integration.png" alt="Add custom integration dialog" class="w-full rounded border border-default">
                    <ol start="5" class="list-decimal list-inside space-y-2 text-muted">
                      <li>Click Next and follow the prompts to confirm/authorize the integration</li>
                      <li>After completing, return to Custom Integrations and confirm it is listed and the status is <strong>Active</strong></li>
                    </ol>
                  </div>
                </template>
              </UPopover>
            </div>
          </template>
        </UPopover>
      </div>

      <div v-if="error" class="flex flex-col gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        <p>{{ error }}</p>
        <UButton
          v-if="!showManualInput"
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-pencil"
          @click="showManualInput = true"
        >
          Enter Hub ID manually
        </UButton>
        <div v-if="showManualInput" class="flex items-center gap-2">
          <UInput
            v-model="manualHubId"
            placeholder="b.xxxxxxxx-xxxx-xxxx-xxxx"
            size="sm"
            class="flex-1"
            @keyup.enter="onAddManualHub"
          />
          <UButton size="sm" @click="onAddManualHub">
            Load
          </UButton>
        </div>
      </div>

      <div v-if="warnings.length && !items.length" class="flex flex-col gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
        <div class="flex items-center gap-2 font-medium">
          <UIcon name="i-lucide-triangle-alert" />
          No hubs returned. Your APS app may not be provisioned.
        </div>
        <ul class="list-inside list-disc space-y-1 text-xs">
          <li v-for="(w, i) in warnings" :key="i">
            {{ w }}
          </li>
        </ul>
        <p class="text-xs opacity-75">
          An account admin must add your app's Client ID under ACC Admin &gt; Custom Integrations.
        </p>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-lucide-loader" class="animate-spin" />
        Loading hubs...
      </div>

      <ClientOnly>
        <div v-if="!loading && favoriteProjects.length > 0" class="flex flex-col gap-1">
          <p class="text-xs font-medium text-muted">
            Favorites
          </p>
          <div class="flex flex-wrap gap-1">
            <UButton
              v-for="fav in favoriteProjects"
              :key="`${fav.projectId}-${fav.folderId || ''}`"
              size="xs"
              variant="subtle"
              color="neutral"
              icon="i-lucide-star"
              :label="fav.label"
              @click="onFavoriteClick(fav)"
            />
          </div>
        </div>
      </ClientOnly>

      <UInput
        v-if="!loading && items.length > 0"
        v-model="treeFilter"
        icon="i-lucide-search"
        placeholder="Search projects..."
        size="sm"
        variant="subtle"
      >
        <template v-if="treeFilter" #trailing>
          <UTooltip text="Clear filter">
            <UButton
              icon="i-lucide-x"
              size="xs"
              variant="ghost"
              color="neutral"
              @click="treeFilter = ''"
            />
          </UTooltip>
        </template>
      </UInput>
    </div>

    <!-- Scrollable tree section -->
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <div v-if="!loading" ref="treeContainer">
        <UTree
          v-model:expanded="expandedKeys"
          :items="filteredItems"
          :get-key="(item: TreeItem) => (item as ApsTreeItem)._apsId"
          expanded-icon="i-lucide-folder-open"
          collapsed-icon="i-lucide-folder"
          color="neutral"
          @toggle="onToggle"
          @select="onSelect"
        >
          <template #loading-leading>
            <UIcon name="i-lucide-loader" class="animate-spin shrink-0" />
          </template>
          <template #project-trailing="{ item }">
            <span :data-aps-id="(item as ApsTreeItem)._apsId" class="hidden" aria-hidden="true" />
            <div class="flex items-center" @click.stop>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-file-search"
                class="whitespace-nowrap"
                :loading="searchingProject === (item as ApsTreeItem)._projectId"
                @click="onSearchRevitFiles(item as ApsTreeItem)"
              >
                {{ searchingProject === (item as ApsTreeItem)._projectId ? 'Scanning...' : 'Show Revit Files' }}
              </UButton>
              <UTooltip :text="isFavorite(item as ApsTreeItem) ? 'Remove from favorites' : 'Add to favorites'">
                <UButton
                  size="xs"
                  variant="ghost"
                  :color="isFavorite(item as ApsTreeItem) ? 'warning' : 'neutral'"
                  icon="i-lucide-star"
                  @click="toggleFavorite(item as ApsTreeItem)"
                />
              </UTooltip>
              <UTooltip v-if="(item as ApsTreeItem)._folderId" text="Remove project">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-x"
                  @click="removeExternalProject(item as ApsTreeItem)"
                />
              </UTooltip>
            </div>
          </template>
          <template #item-trailing="{ item }">
            <template v-if="isRvtItem(item as ApsTreeItem)">
              <UBadge
                size="sm"
                color="primary"
                variant="subtle"
              >
                RVT
              </UBadge>
              <div @click.stop>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-external-link"
                  :to="getAccUrl(item as ApsTreeItem)"
                  target="_blank"
                />
              </div>
              <div @click.stop>
                <UCheckbox
                  :model-value="isFileSelected(getItemId(item as ApsTreeItem))"
                  size="sm"
                  @update:model-value="toggleFile(
                    getItemId(item as ApsTreeItem),
                    (item as ApsTreeItem)._projectId || '',
                    (item as ApsTreeItem).label || '',
                    (item as ApsTreeItem)._region,
                    (item as ApsTreeItem)._projectName
                  )"
                />
              </div>
            </template>
          </template>
        </UTree>
      </div>
    </div>

    <!-- Collapsible search results -->
    <div v-if="searchResults.length > 0" class="shrink-0 border-t border-default">
      <div class="flex items-center justify-between px-4 py-2">
        <UButton
          icon="i-lucide-file-search"
          size="xs"
          variant="ghost"
          color="neutral"
          :label="`${filteredResults.length}/${searchResults.length} .rvt`"
          :trailing-icon="resultsDrawerOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
          @click="resultsDrawerOpen = !resultsDrawerOpen"
        />
        <div class="flex items-center gap-1">
          <span v-if="searchProgress" class="text-xs text-muted">{{ searchProgress }}</span>
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-check-check"
            label="Select All"
            @click="selectAllResults"
          />
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-square-minus"
            label="Deselect All"
            @click="deselectAllResults"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            label="Close"
            @click="onCloseSearchResults"
          />
        </div>
      </div>

      <UCollapsible v-model:open="resultsDrawerOpen">
        <template #content>
          <div class="px-4 pb-1">
            <UInput
              v-model="resultsFilter"
              class="w-full"
              icon="i-lucide-search"
              placeholder="Filter results..."
              size="xs"
              variant="subtle"
            >
              <template v-if="resultsFilter" #trailing>
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="resultsFilter = ''"
                />
              </template>
            </UInput>
          </div>
          <div class="max-h-[35vh] overflow-y-auto px-4 pb-3 pt-1">
            <div class="flex flex-col gap-1">
              <div
                v-for="file in filteredResults"
                :key="file.id"
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-elevated"
                @click="onSearchResultClick(file.id, file.name)"
              >
                <UIcon name="i-sprint-file-rvt" class="text-muted shrink-0" />
                <span class="truncate">{{ file.name }}</span>
                <span class="text-muted truncate text-xs">{{ file.path }}</span>
                <div class="ml-auto" @click.stop>
                  <UCheckbox
                    :model-value="isFileSelected(file.id)"
                    size="sm"
                    @update:model-value="onSearchResultClick(file.id, file.name)"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </UCollapsible>
    </div>
  </div>
</template>
