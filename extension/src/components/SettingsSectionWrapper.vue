<template>
  <div>
    <div
      @click="isExpanded = !isExpanded"
      class="w-full h-12 flex-col justify-center cursor-pointer gap-3.5 inline-flex border-b border-slate-500"
    >
      <div
        class="self-stretch pl-1.5 pr-4 justify-between items-center inline-flex"
      >
        <div class="w-20 text-white font-medium">{{ title }}</div>
        <ChevronRightIcon
          class="w-5 text-slate-400 transition-all duration-300 ease-in-out"
          :class="{ 'rotate-90': isExpanded }"
        />
      </div>
    </div>
    <Collapse :when="isExpanded" class="v-collapse">
      <slot> </slot>
    </Collapse>
  </div>
</template>

<script setup lang="ts">
import { ChevronRightIcon } from "@heroicons/vue/20/solid";
import { ref } from "vue";
import { Collapse } from "vue-collapsed";

const props = defineProps<{ title: string }>();

const isExpanded = ref(false);
</script>

<style scoped></style>
