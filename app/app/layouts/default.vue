<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useFavoritesStore } from '~/stores/favorites'

const open = ref(false)
const favoritesStore = useFavoritesStore()

const pendingNavigation = useState<{ projectId: string, hubId: string, region?: string } | null>('pending-favorite-nav', () => null)

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(toIndex: number) {
  if (dragIndex.value !== null && dragIndex.value !== toIndex) {
    favoritesStore.reorder(dragIndex.value, toIndex)
  }
  dragIndex.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

const links = [[{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/dashboard',
  onSelect: () => {
    open.value = false
  }
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.flat()
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/dashboard" class="flex items-center px-2 py-2">
          <TheLogo v-if="!collapsed" class="h-8 w-auto" />
          <span v-else class="text-lg font-bold">S</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <!-- Favorites -->
        <div v-if="favoritesStore.sortedFavorites.length > 0" class="flex flex-col gap-0.5 px-2.5">
          <span v-if="!collapsed" class="px-2 py-1 text-xs font-medium text-muted uppercase tracking-wider">
            Favorites
          </span>
          <div
            v-for="(fav, index) in favoritesStore.sortedFavorites"
            :key="fav.projectId"
            draggable="true"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors hover:bg-elevated"
            :class="{
              'bg-elevated/50': dragOverIndex === index && dragIndex !== index,
              'opacity-50': dragIndex === index
            }"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
            @dragleave="onDragLeave"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
            @click="pendingNavigation = { projectId: fav.projectId, hubId: fav.hubId, region: fav.region }"
          >
            <UTooltip v-if="collapsed" :text="fav.label" side="right">
              <UIcon name="i-lucide-folder-kanban" class="shrink-0 text-muted" />
            </UTooltip>
            <template v-else>
              <UIcon name="i-lucide-folder-kanban" class="shrink-0 text-muted" />
              <span class="truncate">{{ fav.label }}</span>
            </template>
          </div>
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>
