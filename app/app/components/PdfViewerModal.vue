<script setup lang="ts">
const props = defineProps<{
  pdfUrl: string
  title: string
}>()

const open = defineModel<boolean>('open', { default: false })

const loading = ref(true)

function onLoad() {
  loading.value = false
}

watch(open, (val) => {
  if (val) loading.value = true
})
</script>

<template>
  <UModal v-model:open="open" fullscreen :title="title">
    <template #default />

    <template #body>
      <div class="relative h-full w-full min-h-0">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
          <UIcon name="i-lucide-loader" class="animate-spin size-8 text-muted" />
        </div>
        <iframe
          v-if="open"
          :src="props.pdfUrl"
          type="application/pdf"
          class="h-full w-full border-0"
          @load="onLoad"
        />
      </div>
    </template>
  </UModal>
</template>
