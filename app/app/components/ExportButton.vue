<script setup lang="ts">
const {
  totalSelectedCount,
  exporting,
  exportError,
  downloadComplete,
  exportOptions,
  exportSelected
} = useDerivatives()
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
            <URadioGroup
              v-model="exportOptions.mergeScope"
              legend="Merge"
              orientation="horizontal"
              size="xs"
              :items="[
                { label: 'None', value: 'none' },
                { label: 'Per model', value: 'per-model' },
                { label: 'All', value: 'all' }
              ]"
            />
            <USwitch
              v-model="exportOptions.zip"
              label="Zip output"
              size="xs"
            />
            <USwitch
              v-model="exportOptions.modelFolders"
              label="Folders per model"
              size="xs"
            />
          </div>
        </template>
      </UPopover>

      <UButton
        :label="exporting ? 'Exporting...' : `Export ${totalSelectedCount} PDF${totalSelectedCount === 1 ? '' : 's'}`"
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
      title="Export complete"
      description="Your download should start automatically."
    />
  </div>
</template>
