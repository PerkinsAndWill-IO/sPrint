<script setup lang="ts">
const { selectedFilesList, totalSelectedCount, clearAll } = useDerivatives()

const mobileSelectionOpen = ref(false)

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <UDashboardPanel id="dashboard-tree" resizable :default-size="55" :min-size="30" :max-size="70">
    <template #header>
      <UDashboardNavbar title="SPRINT">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ApsProjectTree />
    </template>
  </UDashboardPanel>

  <!-- Desktop: side-by-side panel -->
  <UDashboardPanel id="dashboard-selection" class="hidden lg:flex">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <span>Selected Files</span>
          <UBadge v-if="selectedFilesList.length > 0" size="sm" color="primary" variant="subtle" class="ml-2">
            {{ selectedFilesList.length }}
          </UBadge>
        </template>
        <template #trailing>
          <UTooltip v-if="selectedFilesList.length > 0" text="Clear all">
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              @click="clearAll"
            />
          </UTooltip>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <SelectedFilesPanel />
    </template>

    <template #footer>
      <div v-if="totalSelectedCount > 0" class="p-4 border-t border-default">
        <ExportButton />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Mobile: floating button + slideover -->
  <div class="lg:hidden">
    <USlideover v-model:open="mobileSelectionOpen" title="Selected Files" side="right">
      <UButton
        icon="i-lucide-files"
        size="lg"
        class="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
      >
        <template v-if="selectedFilesList.length > 0">
          {{ selectedFilesList.length }}
        </template>
      </UButton>

      <template #body>
        <SelectedFilesPanel />
      </template>

      <template #footer>
        <div v-if="totalSelectedCount > 0" class="p-4">
          <ExportButton />
        </div>
      </template>
    </USlideover>
  </div>
</template>
