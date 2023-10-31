<template>
  <div class="w-full relative">
    <input
      v-model="searchKey"
      class="w-full bg-slate-700 h-6 rounded-full px-8"
      placeholder="Search"
    />
    <MagnifyingGlassIcon class="w-4 absolute top-1 text-slate-300 left-2" />
    <XCircleIcon
      @click="reset"
      class="w-4 absolute top-1 text-slate-300 right-2 hover:text-white"
    />
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/vue/20/solid";
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";

const emit = defineEmits<{ (event: "search", value: string): void }>();

const searchKey = ref("");

watch(searchKey, (value) => {
  debouncedFn(value);
});

const debouncedFn = useDebounceFn((value) => {
  emit("search", value);
}, 300);

function reset() {
  searchKey.value = "";
}
</script>

<style scoped></style>
