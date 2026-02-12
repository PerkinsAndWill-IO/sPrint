<script setup lang="ts">
import type { PdfDerivative, PdfViewSet } from '~/types/derivatives'

const props = defineProps<{
  derivatives: PdfDerivative[]
  viewSets: PdfViewSet[]
}>()

const emit = defineEmits<{
  toggleDerivative: [guid: string]
  toggleViewSet: [name: string]
  selectAll: []
  deselectAll: []
  preview: [guid: string]
}>()

const search = ref('')

const filteredDerivatives = computed(() => {
  if (!search.value) return props.derivatives
  const q = search.value.toLowerCase()
  return props.derivatives.filter(d => d.name.toLowerCase().includes(q))
})

const selectedCount = computed(() =>
  props.derivatives.filter(d => d.active).length
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <UInput
        v-model="search"
        placeholder="Filter sheets..."
        icon="i-lucide-search"
        size="sm"
        class="flex-1"
      />
      <UBadge color="primary" variant="subtle">
        {{ selectedCount }} / {{ derivatives.length }}
      </UBadge>
    </div>

    <div class="flex items-center gap-2">
      <UButton size="xs" variant="outline" color="neutral" @click="emit('selectAll')">
        Select All
      </UButton>
      <UButton size="xs" variant="outline" color="neutral" @click="emit('deselectAll')">
        Deselect All
      </UButton>
    </div>

    <div v-if="viewSets.length > 1" class="flex flex-col gap-2">
      <p class="text-xs font-medium text-muted">
        View Sets
      </p>
      <div class="flex flex-wrap gap-2">
        <UCheckbox
          v-for="vs in viewSets"
          :key="vs.name"
          :model-value="vs.active"
          :label="vs.name"
          size="sm"
          @update:model-value="emit('toggleViewSet', vs.name)"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <p class="text-xs font-medium text-muted">
        Sheets
      </p>
      <div class="max-h-96 overflow-y-auto">
        <div
          v-for="d in filteredDerivatives"
          :key="d.guid"
          class="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-elevated"
        >
          <UCheckbox
            :model-value="d.active"
            :label="d.name"
            size="sm"
            class="flex-1 min-w-0"
            @update:model-value="emit('toggleDerivative', d.guid)"
          />
          <UTooltip text="Preview PDF">
            <UButton
              icon="i-lucide-eye"
              size="xs"
              color="neutral"
              variant="ghost"
              class="opacity-0 group-hover:opacity-100 shrink-0"
              @click.stop="emit('preview', d.guid)"
            />
          </UTooltip>
        </div>
        <p v-if="filteredDerivatives.length === 0" class="text-sm text-muted py-2">
          No sheets found
        </p>
      </div>
    </div>
  </div>
</template>
