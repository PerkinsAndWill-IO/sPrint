<script setup lang="ts">
const {
  selectedFilesList,
  totalSelectedCount,
  exporting,
  exportError,
  downloadComplete,
  exportOptions,
  exportSelected
} = useDerivatives()

const selectionIsPdfOnly = computed(() => {
  for (const file of selectedFilesList.value) {
    for (const d of file.derivatives) {
      if (d.active && d.format !== 'pdf') return false
    }
  }
  return true
})

const exportLabel = computed(() => {
  if (exporting.value) return 'Preparing download...'
  const count = totalSelectedCount.value
  if (selectionIsPdfOnly.value) {
    return `Download ${count} PDF${count === 1 ? '' : 's'}`
  }
  return `Download ${count} file${count === 1 ? '' : 's'}`
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex gap-2">
      <UPopover :content="{ align: 'start', side: 'top' }">
        <UButton
          icon="i-lucide-settings"
          color="neutral"
          variant="subtle"
        />

        <template #content>
          <div class="flex flex-col gap-3 p-3">
            <template v-if="selectionIsPdfOnly">
              <URadioGroup
                v-model="exportOptions.mergeScope"
                legend="Merge"
                size="xs"
                class="max-w-64"
                :items="[
                  { label: 'None', value: 'none', description: 'Download each PDF separately unless zip output is enabled.' },
                  { label: 'Per model', value: 'per-model', description: 'Combine PDFs from each Revit model into one PDF per model.' },
                  { label: 'All', value: 'all', description: 'Combine all selected PDFs into one PDF.' }
                ]"
              />
            </template>
            <p v-else class="text-xs text-muted">
              Merge is only available for PDF selections
            </p>
            <USwitch
              v-model="exportOptions.zip"
              label="Zip output"
              description="Package downloads into a ZIP file. Required when downloading multiple separate files."
              size="xs"
              class="max-w-64"
            />
            <USwitch
              v-model="exportOptions.modelFolders"
              label="Folders per model"
              description="Organize downloaded files into one folder per Revit model inside the ZIP."
              size="xs"
              class="max-w-64"
            />
          </div>
        </template>
      </UPopover>

      <UButton
        :label="exportLabel"
        :loading="exporting"
        :disabled="totalSelectedCount === 0 || exporting"
        icon="i-lucide-download"
        block
        @click="exportSelected"
      />
    </div>
    <UAlert
      v-if="exportError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="exportError"
    />
    <UAlert
      v-if="downloadComplete && !exportError"
      color="success"
      variant="subtle"
      icon="i-lucide-check-circle"
      title="Download complete"
      description="Your download should start automatically."
      close
      @update:open="downloadComplete = false"
    />
  </div>
</template>
