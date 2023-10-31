<template>
  <div
    class="flex space-x-3 items-center rounded-full h-5 bg-slate-700 py-2.5 px-2"
  >
    <input
      v-if="derivative.guid"
      :id="derivative.guid"
      :name="derivative.name"
      type="checkbox"
      class="flex-none"
      v-model="derivative.active"
    />
    <label class="truncate w-full" :for="derivative.guid">
      {{ derivative.name }}
    </label>
    <p class="truncate text-gray-400 w-20">{{ derivative.role }}</p>
  </div>
</template>

<script setup lang="ts">
import { Derivative } from "../types";

defineProps<{ derivative: Derivative }>();
</script>

<style scoped>
input[type="checkbox"] {
  @apply bg-red-200;
}
</style>
