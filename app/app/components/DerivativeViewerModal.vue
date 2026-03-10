<script setup lang="ts">
import type { DerivativeFormat } from '~/types/derivatives'

const props = defineProps<{
  url: string
  title: string
  format: DerivativeFormat
  modelUrn?: string
  region?: string
}>()

const open = defineModel<boolean>('open', { default: false })

const loading = ref(true)
const jsonData = ref<unknown>(null)
const jsonError = ref<string | null>(null)
const viewerError = ref<string | null>(null)

const viewerContainer = ref<HTMLDivElement | null>(null)
let viewer: Autodesk.Viewing.GuiViewer3D | null = null

function onLoad() {
  loading.value = false
}

async function loadForgeViewerScript(): Promise<void> {
  if ((window as any).Autodesk?.Viewing) return

  // Load CSS
  if (!document.querySelector('link[href*="viewer3D"]')) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css'
    document.head.appendChild(link)
  }

  // Load JS
  if (!document.querySelector('script[src*="viewer3D"]')) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Autodesk Viewer'))
      document.head.appendChild(script)
    })
  }
}

async function initForgeViewer() {
  if (!props.modelUrn || !viewerContainer.value) return

  loading.value = true
  viewerError.value = null

  try {
    await loadForgeViewerScript()

    // Get access token from our server
    const { access_token } = await $fetch<{ access_token: string }>('/api/aps/viewer-token')

    // Initialize the viewer
    await new Promise<void>((resolve, reject) => {
      const options: Autodesk.Viewing.InitializerOptions = {
        env: props.region === 'EMEA' ? 'AutodeskProduction2' : 'AutodeskProduction',
        api: props.region === 'EMEA' ? 'streamingV2_EU' : 'streamingV2',
        getAccessToken: (onTokenReady) => {
          onTokenReady(access_token, 3600)
        }
      }

      Autodesk.Viewing.Initializer(options, () => {
        resolve()
      })
    })

    // Create viewer instance
    viewer = new Autodesk.Viewing.GuiViewer3D(viewerContainer.value)
    const startedCode = viewer.start()
    if (startedCode > 0) {
      throw new Error('Failed to start viewer')
    }

    // Load the document
    const documentId = `urn:${props.modelUrn}`
    await new Promise<void>((resolve, reject) => {
      Autodesk.Viewing.Document.load(
        documentId,
        (doc) => {
          const defaultModel = doc.getRoot().getDefaultGeometry()
          if (!defaultModel) {
            reject(new Error('No viewable geometry found in this model'))
            return
          }
          viewer!.loadDocumentNode(doc, defaultModel).then(() => {
            resolve()
          }).catch(reject)
        },
        (errorCode, errorMsg) => {
          reject(new Error(errorMsg || `Failed to load document (code: ${errorCode})`))
        }
      )
    })

    loading.value = false
  }
  catch (e) {
    viewerError.value = e instanceof Error ? e.message : 'Failed to load 3D viewer'
    loading.value = false
  }
}

function destroyViewer() {
  if (viewer) {
    viewer.finish()
    viewer = null
  }
}

watch(open, async (val) => {
  if (val) {
    loading.value = true
    jsonData.value = null
    jsonError.value = null
    viewerError.value = null

    if (props.format === 'aec') {
      try {
        const res = await fetch(props.url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        jsonData.value = await res.json()
      }
      catch (e) {
        jsonError.value = e instanceof Error ? e.message : 'Failed to load JSON'
      }
      finally {
        loading.value = false
      }
    }
    else if (props.format === 'svf') {
      await nextTick()
      initForgeViewer()
    }
  }
  else {
    destroyViewer()
  }
})

onBeforeUnmount(() => {
  destroyViewer()
})
</script>

<template>
  <UModal v-model:open="open" fullscreen :title="title">
    <template #default />

    <template #body>
      <div class="relative h-full w-full min-h-0">
        <!-- PDF: iframe -->
        <template v-if="format === 'pdf'">
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
            <UIcon name="i-lucide-loader" class="animate-spin size-8 text-muted" />
          </div>
          <iframe
            v-if="open"
            :src="props.url"
            type="application/pdf"
            class="h-full w-full border-0"
            @load="onLoad"
          />
        </template>

        <!-- Thumbnail: centered image -->
        <template v-else-if="format === 'thumbnail'">
          <div class="flex items-center justify-center h-full">
            <img
              v-if="open"
              :src="props.url"
              :alt="title"
              class="max-w-full max-h-full object-contain"
              @load="onLoad"
            />
          </div>
        </template>

        <!-- AEC Model Data: JSON viewer -->
        <template v-else-if="format === 'aec'">
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
            <UIcon name="i-lucide-loader" class="animate-spin size-8 text-muted" />
          </div>
          <div v-else-if="jsonError" class="flex flex-col items-center justify-center h-full gap-4">
            <UIcon name="i-lucide-alert-circle" class="size-16 text-error" />
            <p class="text-error text-sm">
              {{ jsonError }}
            </p>
          </div>
          <div v-else class="h-full overflow-auto p-4">
            <pre class="text-xs font-mono whitespace-pre-wrap break-words bg-elevated rounded-lg p-4">{{ JSON.stringify(jsonData, null, 2) }}</pre>
          </div>
        </template>

        <!-- SVF: Autodesk Forge Viewer -->
        <template v-else-if="format === 'svf'">
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center z-10">
            <div class="flex flex-col items-center gap-3">
              <UIcon name="i-lucide-loader" class="animate-spin size-8 text-muted" />
              <p class="text-sm text-muted">
                Loading 3D viewer...
              </p>
            </div>
          </div>
          <div v-if="viewerError" class="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <UIcon name="i-lucide-alert-circle" class="size-16 text-error" />
            <p class="text-error text-sm text-center max-w-md">
              {{ viewerError }}
            </p>
          </div>
          <div ref="viewerContainer" class="h-full w-full" />
        </template>

        <!-- Everything else: download prompt -->
        <template v-else>
          <div class="flex flex-col items-center justify-center h-full gap-4">
            <UIcon name="i-lucide-file" class="size-16 text-muted" />
            <p class="text-muted text-sm">
              Preview not available for this file type
            </p>
            <UButton
              :href="props.url"
              download
              icon="i-lucide-download"
              label="Download"
              color="primary"
            />
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
