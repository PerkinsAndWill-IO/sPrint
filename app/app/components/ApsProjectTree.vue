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

function onSelect(_e: unknown, item: TreeItem) {
  const apsItem = item as ApsTreeItem
  if (apsItem._apsType === 'project') {
    selectedProject.value = apsItem
  }
}

function onSearchRevitFiles() {
  if (!selectedProject.value?._hubId || !selectedProject.value?._projectId) return
  searchRevitFiles(selectedProject.value._hubId, selectedProject.value._projectId)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">
        Autodesk Projects
      </h2>
      <UButton
        v-if="selectedProject && !searchingProject"
        size="sm"
        icon="i-lucide-search"
        @click="onSearchRevitFiles"
      >
        Find all .rvt files
      </UButton>
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
      <template #item-trailing="{ item }">
        <UBadge
          v-if="(item as ApsTreeItem)._apsType === 'item' && (item as ApsTreeItem).label?.toLowerCase().endsWith('.rvt')"
          size="sm"
          color="success"
          variant="subtle"
        >
          RVT
        </UBadge>
      </template>
    </UTree>

    <!-- Search progress & results -->
    <div v-if="searchingProject || searchResults.length > 0" class="mt-4 flex flex-col gap-3">
      <div v-if="searchingProject" class="flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-lucide-loader" class="animate-spin" />
        {{ searchProgress }}
      </div>
      <div v-else-if="searchProgress" class="text-sm text-muted">
        {{ searchProgress }}
      </div>

      <div v-if="searchResults.length > 0" class="flex flex-col gap-1">
        <h3 class="text-sm font-medium">
          Discovered .rvt files ({{ searchResults.length }})
        </h3>
        <div
          v-for="file in searchResults"
          :key="file.id"
          class="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-elevated"
        >
          <UIcon name="i-lucide-file-box" class="text-muted shrink-0" />
          <span class="truncate">{{ file.name }}</span>
          <span class="text-muted truncate text-xs">{{ file.path }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
