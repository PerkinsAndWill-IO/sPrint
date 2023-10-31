<template>
  <button class="bg-slate-700 rounded-full flex-none w-6 h-6">
    <Cog6ToothIcon
      class="h-4 w-4 hover:text-white text-slate-300 m-auto"
      @click="router.push('/settings')"
    />
  </button>
</template>

<script setup lang="ts">
import { Cog6ToothIcon } from "@heroicons/vue/20/solid";
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<style scoped></style>
