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
const advancedOpen = ref(false)
const activeFormatFilter = ref<DerivativeFormat | null>(null)

const pdfDerivatives = computed(() => props.derivatives.filter(d => d.format === 'pdf'))
const advancedDerivatives = computed(() => props.derivatives.filter(d => d.format !== 'pdf'))

const availableFormats = computed(() => getFormatCounts(advancedDerivatives.value))

function applySearch(list: Derivative[]) {
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter(d => d.name.toLowerCase().includes(q))
}

const filteredPdfs = computed(() => applySearch(pdfDerivatives.value))

const filteredAdvanced = computed(() => {
  let list = advancedDerivatives.value
  if (activeFormatFilter.value) {
    list = list.filter(d => d.format === activeFormatFilter.value)
  }
  return applySearch(list)
})

const filteredPdfGuids = computed(() => filteredPdfs.value.map(d => d.guid))
const filteredAdvancedGuids = computed(() => filteredAdvanced.value.map(d => d.guid))

const selectedPdfCount = computed(() =>
  pdfDerivatives.value.filter(d => d.active).length
)

function toggleFormatFilter(format: DerivativeFormat) {
  activeFormatFilter.value = activeFormatFilter.value === format ? null : format
}

function isPreviewable(format: DerivativeFormat): boolean {
  return PREVIEWABLE_FORMATS.has(format)
}

const viewSetStates = computed(() => {
  const states = new Map<string, boolean | 'indeterminate'>()
  for (const vs of props.viewSets) {
    const setDerivatives = props.derivatives.filter(d => d.viewSets.includes(vs.name))
    const activeCount = setDerivatives.filter(d => d.active).length
    if (activeCount === 0) {
      states.set(vs.name, false)
    } else if (activeCount === setDerivatives.length) {
      states.set(vs.name, true)
    } else {
      states.set(vs.name, 'indeterminate')
    }
  }
  return states
})

const virtualizeOptions = { estimateSize: () => 28, skipMeasurement: true, overscan: 10 }
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
        {{ selectedPdfCount }} / {{ pdfDerivatives.length }}
      </UBadge>
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium text-muted">
        Print Sets
      </p>
      <p v-if="viewSets.length === 0" class="text-sm text-muted">
        No published print sets found for this model.
      </p>
      <div v-else class="flex flex-wrap gap-2">
        <UCheckbox
          v-for="vs in viewSets"
          :key="vs.name"
          :model-value="viewSetStates.get(vs.name)"
          :label="vs.name"
          size="sm"
          @update:model-value="emit('toggleViewSet', vs.name)"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-muted">
          Sheets (PDF)
        </p>
        <div v-if="pdfDerivatives.length > 0" class="flex items-center gap-1">
          <UButton
            size="xs"
            variant="link"
            color="neutral"
            @click="emit('selectAll', filteredPdfGuids)"
          >
            Select All
          </UButton>
          <UButton
            size="xs"
            variant="link"
            color="neutral"
            @click="emit('deselectAll', filteredPdfGuids)"
          >
            Deselect All
          </UButton>
        </div>
      </div>
      <p v-if="filteredPdfs.length === 0" class="text-sm text-muted py-2">
        No PDF sheets found for this model
      </p>
      <UScrollArea
        v-else
        :items="filteredPdfs"
        :virtualize="virtualizeOptions"
        class="max-h-96"
      >
        <template #default="{ item: d }">
          <div
            class="group flex items-center gap-2 rounded px-1 hover:bg-elevated"
            style="height: 28px;"
          >
            <UCheckbox
              :model-value="d.active"
              :label="d.name"
              size="sm"
              class="flex-1 min-w-0"
              :ui="{ label: 'truncate' }"
              @update:model-value="emit('toggleDerivative', d.guid)"
            />
            <UTooltip text="Preview">
              <UButton
                icon="i-lucide-eye"
                size="xs"
                color="neutral"
                variant="ghost"
                class="shrink-0"
                @click.stop="emit('preview', d.guid)"
              />
            </UTooltip>
          </div>
        </template>
      </UScrollArea>
    </div>

    <UCollapsible v-if="advancedDerivatives.length > 0" v-model:open="advancedOpen">
      <UButton
        size="xs"
        variant="link"
        color="neutral"
        :trailing-icon="advancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        :label="`Show advanced model data (${advancedDerivatives.length})`"
      />
      <template #content>
        <div class="flex flex-col gap-2 pt-2">
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
              {{ f.count }} {{ f.label }}
            </UButton>
          </div>

          <div class="flex items-center justify-between">
            <p class="text-xs font-medium text-muted">
              Advanced Model Data
            </p>
            <div class="flex items-center gap-1">
              <UButton
                size="xs"
                variant="link"
                color="neutral"
                @click="emit('selectAll', filteredAdvancedGuids)"
              >
                Select All
              </UButton>
              <UButton
                size="xs"
                variant="link"
                color="neutral"
                @click="emit('deselectAll', filteredAdvancedGuids)"
              >
                Deselect All
              </UButton>
            </div>
          </div>
          <p v-if="filteredAdvanced.length === 0" class="text-sm text-muted py-2">
            No matching items
          </p>
          <UScrollArea
            v-else
            :items="filteredAdvanced"
            :virtualize="virtualizeOptions"
            class="max-h-96"
          >
            <template #default="{ item: d }">
              <div
                class="group flex items-center gap-2 rounded px-1 hover:bg-elevated"
                style="height: 28px;"
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
            </template>
          </UScrollArea>
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
