<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

const {
  selectedFilesList,
  removeFile,
  toggleDerivative,
  toggleViewSet,
  selectAllForFile,
  deselectAllForFile
} = useDerivatives()

const accordionItems = computed<AccordionItem[]>(() =>
  selectedFilesList.value.map(file => ({
    label: file.name,
    icon: 'i-lucide-file-box',
    value: file.itemId
  }))
)
</script>

<template>
  <div v-if="selectedFilesList.length === 0" class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon name="i-lucide-files" class="text-muted size-10" />
    <p class="text-sm text-muted">
      Select .rvt files from the tree to begin
    </p>
  </div>

  <UAccordion
    v-else
    type="multiple"
    :items="accordionItems"
    :default-value="accordionItems.map(i => i.value!)"
  >
    <template #trailing="{ item }">
      <UButton
        icon="i-lucide-x"
        size="xs"
        color="neutral"
        variant="ghost"
        @click.stop="removeFile(item.value!)"
      />
    </template>

    <template #body="{ item }">
      <div v-for="file in selectedFilesList.filter(f => f.itemId === item.value)" :key="file.itemId">
        <div v-if="file.loading" class="flex items-center gap-2 text-sm text-muted py-4">
          <UIcon name="i-lucide-loader" class="animate-spin" />
          Loading manifest...
        </div>

        <div v-else-if="file.error && !file.revitVersionSupported" class="py-2">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :title="file.error"
          />
        </div>

        <div v-else-if="file.derivatives.length === 0" class="py-4 text-center text-sm text-muted">
          No PDF sheets found in this model.
        </div>

        <div v-else>
          <DerivativeSelector
            :derivatives="file.derivatives"
            :view-sets="file.viewSets"
            @toggle-derivative="toggleDerivative(file.itemId, $event)"
            @toggle-view-set="toggleViewSet(file.itemId, $event)"
            @select-all="selectAllForFile(file.itemId)"
            @deselect-all="deselectAllForFile(file.itemId)"
          />
        </div>
      </div>
    </template>
  </UAccordion>
</template>
