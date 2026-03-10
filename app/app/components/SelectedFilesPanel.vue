<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import type { DerivativeFormat } from '~/types/derivatives'

const {
  selectedFilesList,
  removeFile,
  toggleDerivative,
  toggleViewSet,
  selectAllForFile,
  deselectAllForFile,
  getPreviewUrl
} = useDerivatives()

const previewOpen = ref(false)
const previewUrl = ref('')
const previewTitle = ref('')
const previewFormat = ref<DerivativeFormat>('pdf')
const previewModelUrn = ref('')
const previewRegion = ref<string | undefined>()

function handlePreview(itemId: string, guid: string) {
  const file = selectedFilesList.value.find(f => f.itemId === itemId)
  if (!file) return

  const derivative = file.derivatives.find(d => d.guid === guid)
  if (!derivative) return

  const url = getPreviewUrl(itemId, derivative.urn, derivative.mimeType)
  if (!url) return

  previewUrl.value = url
  previewTitle.value = derivative.name
  previewFormat.value = derivative.format
  previewModelUrn.value = file.urn
  previewRegion.value = file.region
  previewOpen.value = true
}

const FORMAT_LABELS: Record<DerivativeFormat, string> = {
  pdf: 'PDF', dwg: 'DWG', dwf: 'DWF', ifc: 'IFC',
  thumbnail: 'Thumb', aec: 'AEC', sdb: 'SDB', svf: 'SVF', other: 'Other'
}

const FORMAT_COLORS: Record<DerivativeFormat, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
  pdf: 'error', dwg: 'primary', dwf: 'secondary', ifc: 'info',
  thumbnail: 'neutral', aec: 'info', sdb: 'warning', svf: 'success', other: 'neutral'
}

function fileFormatCounts(file: { derivatives: { format: DerivativeFormat }[] }): { format: DerivativeFormat, label: string, color: typeof FORMAT_COLORS[DerivativeFormat], count: number }[] {
  const counts = new Map<DerivativeFormat, number>()
  for (const d of file.derivatives) {
    counts.set(d.format, (counts.get(d.format) || 0) + 1)
  }
  return Array.from(counts.entries()).map(([format, count]) => ({
    format,
    label: FORMAT_LABELS[format],
    color: FORMAT_COLORS[format],
    count
  }))
}

const accordionItems = computed<AccordionItem[]>(() =>
  selectedFilesList.value.map(file => ({
    label: file.name,
    icon: 'i-lucide-file-box',
    value: file.itemId,
    ui: { label: 'flex-1', trailingIcon: 'hidden' }
  }))
)

function fileState(itemId: string) {
  return selectedFilesList.value.find(f => f.itemId === itemId)
}
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
  >
    <template #default="{ item }">
      <div class="flex flex-col items-start gap-1">
        <span class="truncate">{{ item.label }}</span>
        <div v-if="fileState(item.value!)?.loading" class="flex items-center gap-1">
          <UIcon name="i-lucide-loader" class="animate-spin size-3 text-muted" />
        </div>
        <div v-else-if="fileState(item.value!)?.derivatives.length" class="flex flex-wrap gap-1">
          <UBadge
            v-for="fc in fileFormatCounts(fileState(item.value!)!)"
            :key="fc.format"
            size="xs"
            :color="fc.color"
            variant="subtle"
          >
            {{ fc.count }} {{ fc.label }}
          </UBadge>
        </div>
      </div>
    </template>

    <template #trailing="{ item, open }">
      <UIcon
        name="i-lucide-chevron-down"
        class="shrink-0 size-5 ms-auto transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
      <UTooltip text="Remove file">
        <UButton
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          @click.stop="removeFile(item.value!)"
        />
      </UTooltip>
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
          No derivatives found in this model.
        </div>

        <div v-else>
          <DerivativeSelector
            :derivatives="file.derivatives"
            :view-sets="file.viewSets"
            @toggle-derivative="toggleDerivative(file.itemId, $event)"
            @toggle-view-set="toggleViewSet(file.itemId, $event)"
            @select-all="selectAllForFile(file.itemId, $event)"
            @deselect-all="deselectAllForFile(file.itemId, $event)"
            @preview="handlePreview(file.itemId, $event)"
          />
        </div>
      </div>
    </template>
  </UAccordion>

  <DerivativeViewerModal
    v-model:open="previewOpen"
    :url="previewUrl"
    :title="previewTitle"
    :format="previewFormat"
    :model-urn="previewModelUrn"
    :region="previewRegion"
  />
</template>
