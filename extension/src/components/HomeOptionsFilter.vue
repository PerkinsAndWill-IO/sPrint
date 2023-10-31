<template>
  <Menu as="div" class="relative inline-block text-left">
    <div>
      <MenuButton class="bg-slate-700 rounded-full flex-none w-6 h-6">
        <ClipboardDocumentCheckIcon
          class="h-4 w-4 hover:text-white text-slate-300 m-auto"
        />
      </MenuButton>
    </div>

    <!-- @ts-ignore -->
    <Transition
      enterActiveClass="transition duration-100 ease-out"
      enterFromClass="transform scale-95 opacity-0"
      enterToClass="transform scale-100 opacity-100"
      leaveActiveClass="transition duration-75 ease-in"
      leaveFromClass="transform scale-100 opacity-100"
      leaveToClass="transform scale-95 opacity-0"
    >
      <MenuItems
        class="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-slate-500 rounded-md bg-slate-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div class="px-1 py-1">
          <MenuItem v-slot="{ active }">
            <button
              @click="pickAll(true)"
              :class="[
                active ? 'bg-slate-500 text-white' : '',
                'group flex w-full items-center rounded-md px-2 py-2 text-sm',
              ]"
            >
              Select All
            </button>
          </MenuItem>
          <MenuItem v-slot="{ active }">
            <button
              @click="pickAll(false)"
              :class="[
                active ? 'bg-slate-500 text-white' : '',
                'group flex w-full items-center rounded-md px-2 py-2 text-sm',
              ]"
            >
              Unselect All
            </button>
          </MenuItem>
        </div>
        <div class="px-1 py-1">
          <div v-for="(set, index) in sets" :key="index">
            <div
              class="flex space-x-3 pl-2 w-full truncate rounded-md px-1 py-1 text-sm hover:bg-slate-500"
            >
              <input
                type="checkbox"
                :name="set.name"
                :id="set.name"
                v-model="set.active"
              />
              <label class="select-none cursor-pointer" :for="set.name">{{
                set.name
              }}</label>
            </div>
          </div>
        </div>
      </MenuItems>
    </Transition>
  </Menu>
</template>

<script setup lang="ts">
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/vue";
import {
  ClipboardDocumentCheckIcon,
  FunnelIcon,
} from "@heroicons/vue/20/solid";
import { useDerivativesStore } from "../stores/derivatives";
import { computed } from "vue";

//test with: https://docs.b360.autodesk.com/projects/ae3fa636-b231-4fee-ada4-c6dd04a8cdfd/folders/urn:adsk.wipprod:fs.folder:co.yVouG9A2QayXy9LozlPQsw/detail/viewer/items/urn:adsk.wipprod:dm.lineage:3tyTtWnXTmSt8ysYBirf-A
const derivativesStore = useDerivativesStore();
const sets = computed(() => derivativesStore.pdfSets);

function pickAll(select: boolean) {
  for (const set of sets.value) {
    set.active = select;
  }
}
</script>
