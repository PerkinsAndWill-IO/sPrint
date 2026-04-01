<script setup lang="ts">
import type { Derivative, DerivativeFormat, ViewSet } from '~/types/derivatives'
import { FORMAT_LABELS, FORMAT_COLORS, PREVIEWABLE_FORMATS, getFormatCounts } from '~/utils/derivative-formats'

const props = defineProps<{
  derivatives: Derivative[]
  viewSets: ViewSet[]
}>()

const emit = defineEmits<{
  toggleDerivative: [guid: string]
  toggleViewSet: [name: string]
  selectAll: [guids: string[]]
  deselectAll: [guids: string[]]
  preview: [guid: string]
}>()

const search = ref('')
const activeFormatFilter = ref<DerivativeFormat | null>('pdf')

const availableFormats = computed(() => getFormatCounts(props.derivatives))

const filteredDerivatives = computed(() => {
  let list = props.derivatives
  if (activeFormatFilter.value) {
    list = list.filter(d => d.format === activeFormatFilter.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(d => d.name.toLowerCase().includes(q))
  }
  return list
})

const filteredGuids = computed(() => filteredDerivatives.value.map(d => d.guid))

const selectedCount = computed(() =>
  props.derivatives.filter(d => d.active).length
)

function toggleFormatFilter(format: DerivativeFormat) {
  activeFormatFilter.value = activeFormatFilter.value === format ? null : format
}

function isPreviewable(format: DerivativeFormat): boolean {
  return PREVIEWABLE_FORMATS.has(format)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <UInput
        v-model="search"
        placeholder="Filter derivatives..."
        icon="i-lucide-search"
        size="sm"
        class="flex-1"
      />
      <UBadge color="primary" variant="subtle">
        {{ selectedCount }} / {{ derivatives.length }}
      </UBadge>
    </div>

    <div v-if="availableFormats.length > 1" class="flex flex-wrap gap-1">
      <UButton
        size="xs"
        :variant="activeFormatFilter === null ? 'solid' : 'subtle'"
        :color="activeFormatFilter === null ? 'primary' : 'neutral'"
        @click="activeFormatFilter = null"
      >
        All
      </UButton>
      <UButton
        v-for="f in availableFormats"
        :key="f.format"
        size="xs"
        :variant="activeFormatFilter === f.format ? 'solid' : 'subtle'"
        :color="f.color"
        @click="toggleFormatFilter(f.format)"
      >
        {{ f.label }}
        <UBadge size="xs" :color="f.color" variant="solid">
          {{ f.count }}
        </UBadge>
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
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-muted">
          Derivatives
        </p>
        <div class="flex items-center gap-1">
          <UButton
            size="xs"
            variant="link"
            color="neutral"
            @click="emit('selectAll', filteredGuids)"
          >
            Select All
          </UButton>
          <UButton
            size="xs"
            variant="link"
            color="neutral"
            @click="emit('deselectAll', filteredGuids)"
          >
            Deselect All
          </UButton>
        </div>
      </div>
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
            :ui="{ label: 'truncate' }"
            @update:model-value="emit('toggleDerivative', d.guid)"
          />
          <UBadge
            size="xs"
            :color="FORMAT_COLORS[d.format]"
            variant="subtle"
            class="shrink-0"
          >
            {{ FORMAT_LABELS[d.format] }}
          </UBadge>
          <UTooltip :text="isPreviewable(d.format) ? 'Preview' : 'Download'">
            <UButton
              :icon="isPreviewable(d.format) ? 'i-lucide-eye' : 'i-lucide-download'"
              size="xs"
              color="neutral"
              variant="ghost"
              class="shrink-0"
              @click.stop="emit('preview', d.guid)"
            />
          </UTooltip>
        </div>
        <p v-if="filteredDerivatives.length === 0" class="text-sm text-muted py-2">
          No derivatives found
        </p>
      </div>
    </div>
  </div>
</template>
