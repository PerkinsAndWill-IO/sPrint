<template>
  <div>
    <div class="px-3">
      <div>
        <div class="flex space-x-2 justify-center font-semibold text-gray-200">
          <h2 class="text-center">{{ modelName }}</h2>
          <h2 class="text-center" v-show="version">Revit {{ version }}</h2>
        </div>
        <h2 class="text-center text-red-400 font-bold" v-if="error">
          Error: {{ error }}
        </h2>
        <h3 class="py-2">
          Selected PDFs:
          <span class="font-bold text-blue-200" :key="activeDerivativesCount">{{
            activeDerivativesCount
          }}</span>
          /
          <span> {{ derivativesCount }}</span>
        </h3>
      </div>

      <HomeOptions>
        <HomeOptionsSearchBar @search="search" />
        <HomeOptionsFilter />
        <HomeOptionsSettings />
      </HomeOptions>
    </div>

    <div class="py-4 space-y-2 px-3">
      <template v-for="derivative in derivatives">
        <TheRow :derivative="derivative" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import HomeOptions from "../components/HomeOptions.vue";
import HomeOptionsSettings from "../components/HomeOptionsSettings.vue";
import HomeOptionsFilter from "../components/HomeOptionsFilter.vue";
import TheRow from "../components/TheRow.vue";
import { computed, ref, watchEffect } from "vue";
import { useDerivativesStore } from "../stores/derivatives";
import HomeOptionsSearchBar from "../components/HomeOptionsSearchBar.vue";
import { Derivative } from "../types";

const derivativesStore = useDerivativesStore();

const derivatives = ref<Derivative[]>([]);
const modelName = computed(() => derivativesStore.modelName);
const version = computed(() => derivativesStore.version);
const error = computed(() => derivativesStore.error);
const activeSets = computed(() =>
  derivativesStore.pdfSets.filter((s) => s.active).map((s) => s.name)
);

const activeDerivativesCount = computed(
  () => derivativesStore.derivatives.filter((d) => d.active).length
);
const derivativesCount = computed(() => derivativesStore.derivatives.length);

watchEffect(() => {
  derivatives.value = derivativesStore.derivatives;

  for (const derivative of derivativesStore.derivatives) {
    if (Array.isArray(derivative.sets)) {
      derivative.active =
        derivative.sets.filter((s) => activeSets.value.includes(s)).length > 0;
    } else {
      derivative.active = activeSets.value.includes(derivative.sets);
    }
  }
});

function search(value: string) {
  if (!value) {
    derivatives.value = derivativesStore.derivatives;
  } else {
    derivatives.value = derivativesStore.derivatives.filter(
      (d) =>
        d.name.toLowerCase().includes(value.toLowerCase()) ||
        d.children.filter((c) =>
          c.name.toLowerCase().includes(value.toLowerCase())
        ).length > 0
    );
  }
}
</script>
