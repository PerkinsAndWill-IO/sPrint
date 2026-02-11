<script setup lang="ts">
import type { TreeItemToggleEvent } from 'reka-ui'
import type { TreeItem } from '@nuxt/ui'
import type { ApsTreeItem } from '~/types/aps'

const {
  items,
  loading,
  warnings,
  searchingProject,
  searchProgress,
  searchResults,
  loadHubs,
  handleToggle,
  searchRevitFiles,
  addManualHub
} = useApsProjects()

const { isFileSelected, toggleFile } = useDerivatives()

const selectedProject = ref<ApsTreeItem | null>(null)
const error = ref<string | null>(null)
const manualHubId = ref('')
const showManualInput = ref(false)

function onAddManualHub() {
  if (!manualHubId.value.trim()) return
  error.value = null
  showManualInput.value = false
  addManualHub(manualHubId.value.trim())
}

onMounted(async () => {
  try {
    await loadHubs()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load hubs'
  }
})

function onToggle(e: TreeItemToggleEvent<TreeItem>, item: TreeItem) {
  handleToggle(item as ApsTreeItem, e.detail.isExpanded)
}

function isRvtItem(item: ApsTreeItem): boolean {
  return item._apsType === 'item' && !!item.label?.toLowerCase().endsWith('.rvt')
}

function getItemId(item: ApsTreeItem): string {
  return item._apsId.replace('item-', '')
}

function onSelect(_e: unknown, item: TreeItem) {
  const apsItem = item as ApsTreeItem
  if (isRvtItem(apsItem)) {
    const itemId = getItemId(apsItem)
    const projectId = apsItem._projectId
    if (!projectId) return
    toggleFile(itemId, projectId, apsItem.label || '')
  }
}

function onSearchRevitFiles(project: ApsTreeItem) {
  if (!project._hubId || !project._projectId) return
  selectedProject.value = project
  searchRevitFiles(project._hubId, project._projectId)
}

function onSearchResultClick(fileId: string, fileName: string) {
  const project = selectedProject.value
  if (!project?._projectId) return
  toggleFile(fileId, project._projectId, fileName)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Scrollable tree section -->
    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <h2 class="text-lg font-semibold">
        ACC/Bim360 Projects
      </h2>

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

      <UTree
        v-else
        :items="items"
        :get-key="(item: TreeItem) => (item as ApsTreeItem)._apsId"
        expanded-icon="i-lucide-folder-open"
        collapsed-icon="i-lucide-folder"
        color="neutral"
        @toggle="onToggle"
        @select="onSelect"
      >
        <template #project-trailing="{ item }">
          <div @click.stop>
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
        <template #item-trailing="{ item }">
          <template v-if="isRvtItem(item as ApsTreeItem)">
            <UBadge
              size="sm"
              color="success"
              variant="subtle"
            >
              RVT
            </UBadge>
            <div @click.stop>
              <UCheckbox
                :model-value="isFileSelected(getItemId(item as ApsTreeItem))"
                size="sm"
                @update:model-value="toggleFile(
                  getItemId(item as ApsTreeItem),
                  (item as ApsTreeItem)._projectId || '',
                  (item as ApsTreeItem).label || ''
                )"
              />
            </div>
          </template>
        </template>
      </UTree>
    </div>

    <!-- Pinned search results section -->
    <div
      v-if="searchingProject || searchResults.length > 0"
      class="shrink-0 border-t border-default"
    >
      <div class="flex items-center justify-between px-4 py-2">
        <div v-if="searchingProject" class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-loader" class="animate-spin" />
          {{ searchProgress }}
        </div>
        <template v-else>
          <h3 class="text-sm font-medium">
            Discovered .rvt files ({{ searchResults.length }})
          </h3>
          <span v-if="searchProgress" class="text-xs text-muted">{{ searchProgress }}</span>
        </template>
      </div>

      <div v-if="searchResults.length > 0" class="max-h-[35vh] overflow-y-auto px-4 pb-3">
        <div class="flex flex-col gap-1">
          <div
            v-for="file in searchResults"
            :key="file.id"
            class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-elevated"
            @click="onSearchResultClick(file.id, file.name)"
          >
            <UIcon name="i-lucide-file-box" class="text-muted shrink-0" />
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
    </div>
  </div>
</template>
