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
          <div class="flex flex-col gap-2 p-3">
            <USwitch
              v-model="exportOptions.mergePdfs"
              size="xs"
              label="Merge into one PDF"
            />
            <USwitch
              v-model="exportOptions.zipOutput"
              size="xs"
              label="Zip output"
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
