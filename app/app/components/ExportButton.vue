<script setup lang="ts">
const {
  totalSelectedCount,
  exporting,
  exportError,
  downloadComplete,
  exportSelected
} = useDerivatives()
</script>

<template>
  <div class="flex flex-col gap-2">
    <UButton
      :label="exporting ? 'Exporting...' : `Export ${totalSelectedCount} PDF${totalSelectedCount === 1 ? '' : 's'}`"
      :loading="exporting"
      :disabled="totalSelectedCount === 0 || exporting"
      icon="i-lucide-download"
      block
      @click="exportSelected"
    />
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
