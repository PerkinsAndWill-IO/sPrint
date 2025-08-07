<template>
  <div class="flex flex-col gap-2 p-2">
    <label class="flex items-center gap-2">
      <input
        name="include-markup"
        type="checkbox"
        v-model="settings.includeMarkups"
      />
      Include markups
    </label>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from "../stores/settings";

const settings = useSettingsStore();
</script>
