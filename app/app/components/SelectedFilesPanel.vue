<script setup lang="ts">
import { format } from 'date-fns'
import type { AccordionItem } from '@nuxt/ui'
import type { Derivative, DerivativeFormat } from '~/types/derivatives'

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

const accordionItems = computed<AccordionItem[]>(() =>
  selectedFilesList.value.map(file => ({
    label: file.name,
    icon: 'i-sprint-file-rvt',
    value: file.itemId,
    ui: { label: 'flex-1', trailingIcon: 'hidden' }
  }))
)

// Auto-expand a model once its derivatives resolve with PDFs, so users see
// content immediately. Fires once per file — never fights manual collapse.
const openItems = ref<string[]>([])
const autoExpanded = new Set<string>()

watch(
  () => selectedFilesList.value.map(f => ({ itemId: f.itemId, loading: f.loading })),
  (files) => {
    const currentIds = new Set(files.map(f => f.itemId))
    for (const id of [...autoExpanded]) {
      if (!currentIds.has(id)) autoExpanded.delete(id)
    }
    openItems.value = openItems.value.filter(id => currentIds.has(id))

    for (const f of files) {
      if (f.loading || autoExpanded.has(f.itemId)) continue
      autoExpanded.add(f.itemId)
      const state = fileState(f.itemId)
      if (state && pdfCount(state.derivatives) > 0 && !openItems.value.includes(f.itemId)) {
        openItems.value = [...openItems.value, f.itemId]
      }
    }
  },
  { deep: true }
)

function fileState(itemId: string) {
  return selectedFilesList.value.find(f => f.itemId === itemId)
}

function getAccFileUrl(itemId: string): string {
  const file = selectedFilesList.value.find(f => f.itemId === itemId)
  if (!file) return '#'
  return buildAccProjectUrl(file.projectId, file.region, file.itemId)
}

function pdfCount(derivatives: Derivative[]): number {
  return derivatives.filter(d => d.format === 'pdf').length
}

function lastPublished(itemId: string): string | null {
  const t = fileState(itemId)?.lastModifiedTime
  if (!t) return null
  const parsed = Date.parse(t)
  if (Number.isNaN(parsed)) return null
  return format(new Date(parsed), 'PPp')
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
    v-model="openItems"
    type="multiple"
    :items="accordionItems"
  >
    <template #default="{ item }">
      <div class="flex flex-col items-start gap-1">
        <div class="flex items-center gap-1">
          <span class="truncate">{{ item.label }}</span>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-external-link"
            :to="getAccFileUrl(item.value!)"
            target="_blank"
            @click.stop
          />
        </div>
        <span v-if="lastPublished(item.value!)" class="text-xs text-muted">
          Last published: {{ lastPublished(item.value!) }}
        </span>
        <div class="flex flex-wrap gap-1 min-h-5">
          <template v-if="fileState(item.value!)?.loading">
            <USkeleton class="h-5 w-14 rounded-full" />
            <USkeleton class="h-5 w-16 rounded-full" />
            <USkeleton class="h-5 w-10 rounded-full" />
            <USkeleton class="h-5 w-18 rounded-full" />
          </template>
          <template v-else-if="fileState(item.value!)?.derivatives.length">
            <UBadge
              size="xs"
              color="primary"
              variant="subtle"
            >
              {{ pdfCount(fileState(item.value!)!.derivatives) }} PDF{{ pdfCount(fileState(item.value!)!.derivatives) === 1 ? '' : 's' }}
            </UBadge>
            <UBadge
              v-if="fileState(item.value!)!.derivatives.length - pdfCount(fileState(item.value!)!.derivatives) > 0"
              size="xs"
              color="neutral"
              variant="subtle"
            >
              +{{ fileState(item.value!)!.derivatives.length - pdfCount(fileState(item.value!)!.derivatives) }} advanced
            </UBadge>
          </template>
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
        <div v-if="file.loading" class="flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <USkeleton class="h-8 flex-1 rounded-md" />
            <USkeleton class="h-5 w-12 rounded-full" />
          </div>
          <div class="flex flex-wrap gap-1">
            <USkeleton class="h-6 w-10 rounded-md" />
            <USkeleton class="h-6 w-14 rounded-md" />
            <USkeleton class="h-6 w-12 rounded-md" />
            <USkeleton class="h-6 w-16 rounded-md" />
          </div>
          <div class="flex flex-col gap-1">
            <USkeleton v-for="i in 5" :key="i" class="h-7 w-full rounded-md" />
          </div>
        </div>

        <div v-else-if="file.error && !file.revitVersionSupported" class="py-2">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :title="file.error"
          />
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
