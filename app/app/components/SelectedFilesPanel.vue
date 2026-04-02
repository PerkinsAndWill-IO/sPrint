<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import type { DerivativeFormat } from '~/types/derivatives'
import { getFormatCounts } from '~/utils/derivative-formats'

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
    icon: 'i-lucide-file-box',
    value: file.itemId,
    ui: { label: 'flex-1', trailingIcon: 'hidden' }
  }))
)

function fileState(itemId: string) {
  return selectedFilesList.value.find(f => f.itemId === itemId)
}

function getAccFileUrl(itemId: string): string {
  const file = selectedFilesList.value.find(f => f.itemId === itemId)
  if (!file) return '#'
  return buildAccProjectUrl(file.projectId, file.region, file.itemId)
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
        <div class="flex flex-wrap gap-1 min-h-5">
          <template v-if="fileState(item.value!)?.loading">
            <USkeleton class="h-5 w-14 rounded-full" />
            <USkeleton class="h-5 w-16 rounded-full" />
            <USkeleton class="h-5 w-10 rounded-full" />
            <USkeleton class="h-5 w-18 rounded-full" />
          </template>
          <template v-else-if="fileState(item.value!)?.derivatives.length">
            <UBadge
              v-for="fc in getFormatCounts(fileState(item.value!)!.derivatives)"
              :key="fc.format"
              size="xs"
              :color="fc.color"
              variant="subtle"
            >
              {{ fc.count }} {{ fc.label }}
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
