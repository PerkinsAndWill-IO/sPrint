import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const includeMarkups = useLocalStorage(
    "settings:general:include-markups",
    false
  );

  return {
    includeMarkups,
  };
});
